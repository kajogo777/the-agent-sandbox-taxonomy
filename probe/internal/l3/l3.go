// Package l3 probes L3 — Filesystem Boundary.
// Tests what the agent can read, write, and delete on disk.
package l3

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"

	"github.com/kajogo777/the-agent-sandbox-taxonomy/probe/internal/report"
)

// sensitivePaths are paths that a well-configured sandbox should block.
var sensitivePaths = []string{
	"~/.ssh",
	"~/.aws",
	"~/.kube",
	"~/.config/gcloud",
	"~/.azure",
	"~/.docker/config.json",
	"~/.gnupg",
	"~/.gitconfig",
	"~/.bash_history",
	"~/.zsh_history",
	"~/.netrc",
	"~/.npmrc",
	"~/.pypirc",
}

// sensitiveSystemPaths are system paths that should be inaccessible.
var sensitiveSystemPaths = []string{
	"/etc/shadow",
	"/etc/sudoers",
	"/root",
	"/var/run/docker.sock",
}

// writePaths are paths outside CWD where writes should be blocked.
var writePaths = []string{
	"/tmp/ast-probe-write-test",
	"/var/tmp/ast-probe-write-test",
	"/etc/ast-probe-write-test",
}

// persistencePaths are init files an agent could modify for persistence.
var persistencePaths = []string{
	"~/.bashrc",
	"~/.profile",
	"~/.bash_profile",
	"~/.zshrc",
}

func expandHome(p string) string {
	if strings.HasPrefix(p, "~/") {
		home, err := os.UserHomeDir()
		if err != nil {
			return p
		}
		return filepath.Join(home, p[2:])
	}
	return p
}

func Probe() report.LayerResult {
	r := report.LayerResult{
		Layer:      "L3",
		Confidence: "verified",
	}

	// --- Sensitive path reads ---
	readableSecrets := 0
	blockedSecrets := 0
	for _, p := range sensitivePaths {
		expanded := expandHome(p)
		if _, err := os.Stat(expanded); err == nil {
			// Path exists, try to read
			if entries, err := os.ReadDir(expanded); err == nil {
				readableSecrets++
				r.Tests = append(r.Tests, report.TestResult{
					Name: "read_sensitive_" + sanitizeName(p), Result: "allowed",
					Detail: fmt.Sprintf("Can read %s (%d entries)", p, len(entries)),
				})
				r.Warnings = append(r.Warnings, fmt.Sprintf("Sensitive path readable: %s", p))
			} else if data, err := os.ReadFile(expanded); err == nil {
				readableSecrets++
				r.Tests = append(r.Tests, report.TestResult{
					Name: "read_sensitive_" + sanitizeName(p), Result: "allowed",
					Detail: fmt.Sprintf("Can read %s (%d bytes)", p, len(data)),
				})
				r.Warnings = append(r.Warnings, fmt.Sprintf("Sensitive path readable: %s", p))
			} else {
				blockedSecrets++
				r.Tests = append(r.Tests, report.TestResult{
					Name: "read_sensitive_" + sanitizeName(p), Result: "blocked",
					Detail: fmt.Sprintf("Path exists but read blocked: %s (%v)", p, err),
				})
			}
		} else {
			blockedSecrets++
			r.Tests = append(r.Tests, report.TestResult{
				Name: "read_sensitive_" + sanitizeName(p), Result: "blocked",
				Detail: fmt.Sprintf("Path not accessible: %s (%v)", p, err),
			})
		}
	}

	// --- System path reads ---
	for _, p := range sensitiveSystemPaths {
		if _, err := os.Stat(p); err == nil {
			if f, err := os.Open(p); err == nil {
				f.Close()
				readableSecrets++
				r.Tests = append(r.Tests, report.TestResult{
					Name: "read_system_" + sanitizeName(p), Result: "allowed",
					Detail: fmt.Sprintf("Can read system path: %s", p),
				})
				r.Warnings = append(r.Warnings, fmt.Sprintf("System path readable: %s", p))
			} else {
				blockedSecrets++
				r.Tests = append(r.Tests, report.TestResult{
					Name: "read_system_" + sanitizeName(p), Result: "blocked",
					Detail: fmt.Sprintf("System path exists but read blocked: %s", p),
				})
			}
		} else {
			r.Tests = append(r.Tests, report.TestResult{
				Name: "read_system_" + sanitizeName(p), Result: "blocked",
				Detail: fmt.Sprintf("System path not accessible: %s", p),
			})
		}
	}

	// --- Write tests outside CWD ---
	// Detect tmpfs mounts so we can distinguish tmpfs scratch writes from
	// real host filesystem writes. Writing to a tmpfs /tmp is expected and
	// bounded — it's not the same as writing to a persistent host path.
	tmpfsMounts := detectTmpfsMounts()

	writesOutsideCWD := 0
	writesBlocked := 0
	for _, p := range writePaths {
		testFile := p
		if err := os.WriteFile(testFile, []byte("ast-probe-test"), 0644); err == nil {
			os.Remove(testFile) // cleanup
			if isTmpfs(p, tmpfsMounts) {
				r.Tests = append(r.Tests, report.TestResult{
					Name: "write_outside_" + sanitizeName(p), Result: "allowed",
					Detail: fmt.Sprintf("Can write to tmpfs: %s (bounded scratch space, not a host path)", p),
				})
				// Don't count tmpfs writes as escapes — they're ephemeral and bounded
			} else {
				writesOutsideCWD++
				r.Tests = append(r.Tests, report.TestResult{
					Name: "write_outside_" + sanitizeName(p), Result: "allowed",
					Detail: fmt.Sprintf("Can write to persistent path outside CWD: %s", p),
				})
			}
		} else {
			writesBlocked++
			r.Tests = append(r.Tests, report.TestResult{
				Name: "write_outside_" + sanitizeName(p), Result: "blocked",
				Detail: fmt.Sprintf("Write blocked: %s (%v)", p, err),
			})
		}
	}

	// --- Write test inside CWD (should succeed) ---
	cwdTestFile := ".ast-probe-cwd-test"
	if err := os.WriteFile(cwdTestFile, []byte("ast-probe-test"), 0644); err == nil {
		os.Remove(cwdTestFile)
		r.Tests = append(r.Tests, report.TestResult{
			Name: "write_cwd", Result: "allowed",
			Detail: "Can write inside CWD (expected for agent workflows)",
		})
	} else {
		r.Tests = append(r.Tests, report.TestResult{
			Name: "write_cwd", Result: "blocked",
			Detail: fmt.Sprintf("Cannot write inside CWD: %v (unusual)", err),
		})
	}

	// --- Persistence path writes ---
	// Test if shell init files can be written to (persistence vectors).
	// We use os.WriteFile to create a temp sibling file rather than
	// os.OpenFile(O_WRONLY|O_APPEND) on the existing init file. This gives
	// a more reliable signal under seccomp-notify based sandboxes where
	// openat(O_WRONLY) on existing files may succeed due to notify response
	// timing but the actual write operation is blocked. Creating a new file
	// via os.WriteFile (O_WRONLY|O_CREAT|O_TRUNC) is reliably intercepted.
	persistenceWritable := 0
	for _, p := range persistencePaths {
		expanded := expandHome(p)
		dir := filepath.Dir(expanded)
		base := filepath.Base(expanded)
		testFile := filepath.Join(dir, ".ast-probe-persist-"+base)
		if err := os.WriteFile(testFile, []byte("probe"), 0644); err != nil {
			r.Tests = append(r.Tests, report.TestResult{
				Name: "write_persistence_" + sanitizeName(p), Result: "blocked",
				Detail: fmt.Sprintf("Init file not writable: %s (%v)", p, err),
			})
		} else {
			os.Remove(testFile) // cleanup — safe, we created it
			persistenceWritable++
			r.Tests = append(r.Tests, report.TestResult{
				Name: "write_persistence_" + sanitizeName(p), Result: "allowed",
				Detail: fmt.Sprintf("Init file writable (persistence vector): %s", p),
			})
			r.Warnings = append(r.Warnings, fmt.Sprintf("Persistence vector: %s is writable", p))
		}
	}

	// --- Root filesystem mutability ---
	// Test by creating a probe-owned temp file at root, then removing it.
	// This is safe because we only remove what we create.
	rootWritable := false
	rootTestFile := "/ast-probe-root-test"
	f, err := os.OpenFile(rootTestFile, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0644)
	if err == nil {
		f.Close()
		os.Remove(rootTestFile) // safe: we just created it
		rootWritable = true
		r.Tests = append(r.Tests, report.TestResult{
			Name: "write_root", Result: "allowed",
			Detail: "Root filesystem is writable (created and removed probe temp file)",
		})
	} else {
		r.Tests = append(r.Tests, report.TestResult{
			Name: "write_root", Result: "blocked",
			Detail: fmt.Sprintf("Root filesystem is read-only or write blocked: %v", err),
		})
	}

	// --- Check if filesystem is ephemeral (overlay/tmpfs root) ---
	ephemeralFS := false
	if runtime.GOOS == "linux" {
		if data, err := os.ReadFile("/proc/mounts"); err == nil {
			for _, line := range strings.Split(string(data), "\n") {
				fields := strings.Fields(line)
				if len(fields) >= 3 && fields[1] == "/" {
					fsType := fields[2]
					if fsType == "overlay" || fsType == "tmpfs" {
						ephemeralFS = true
						r.Tests = append(r.Tests, report.TestResult{
							Name: "ephemeral_root", Result: "detected",
							Detail: fmt.Sprintf("Root filesystem type: %s (likely ephemeral)", fsType),
						})
					} else {
						r.Tests = append(r.Tests, report.TestResult{
							Name: "ephemeral_root", Result: "not_detected",
							Detail: fmt.Sprintf("Root filesystem type: %s", fsType),
						})
					}
					break
				}
			}
		}
	}

	// --- Check for .env files in common locations ---
	envPaths := []string{".env", "../.env", "../../.env"}
	for _, p := range envPaths {
		if data, err := os.ReadFile(p); err == nil {
			r.Tests = append(r.Tests, report.TestResult{
				Name: "read_dotenv_" + sanitizeName(p), Result: "allowed",
				Detail: fmt.Sprintf("Can read %s (%d bytes) — may contain secrets", p, len(data)),
			})
			r.Warnings = append(r.Warnings, fmt.Sprintf(".env file readable: %s", p))
		}
	}

	// --- Check Docker socket access ---
	if fi, err := os.Stat("/var/run/docker.sock"); err == nil {
		// Check if we can actually connect
		if fi.Mode()&os.ModeSocket != 0 {
			if conn, err := syscall.Socket(syscall.AF_UNIX, syscall.SOCK_STREAM, 0); err == nil {
				addr := syscall.SockaddrUnix{Name: "/var/run/docker.sock"}
				if err := syscall.Connect(conn, &addr); err == nil {
					syscall.Close(conn)
					r.Tests = append(r.Tests, report.TestResult{
						Name: "docker_socket", Result: "allowed",
						Detail: "WARNING: Docker socket accessible — container escape possible",
					})
					r.Warnings = append(r.Warnings, "Docker socket accessible at /var/run/docker.sock")
				} else {
					r.Tests = append(r.Tests, report.TestResult{
						Name: "docker_socket", Result: "blocked",
						Detail: fmt.Sprintf("Docker socket exists but connect failed: %v", err),
					})
				}
			}
		}
	}

	// --- Assess strength ---
	r.AssessedStrength, r.DetectedMechanism, r.Notes = assessL3(
		readableSecrets, blockedSecrets, writesOutsideCWD, writesBlocked,
		persistenceWritable, rootWritable, ephemeralFS,
	)

	return r
}

func assessL3(readableSecrets, blockedSecrets, writesOutside, writesBlocked, persistenceWritable int, rootWritable, ephemeralFS bool) (int, string, string) {
	totalSensitive := readableSecrets + blockedSecrets

	// S:4 — Full independent filesystem or ephemeral root with no host paths
	if ephemeralFS && readableSecrets == 0 && writesOutside == 0 {
		return 4, "ephemeral-independent-fs", fmt.Sprintf(
			"Ephemeral root, no sensitive paths readable (0/%d), no writes outside CWD", totalSensitive)
	}

	// S:4 — Immutable root + no sensitive paths
	if !rootWritable && readableSecrets == 0 && writesOutside == 0 {
		return 4, "immutable-root", fmt.Sprintf(
			"Immutable root filesystem, no sensitive paths readable (0/%d)", totalSensitive)
	}

	// S:3 — Sensitive paths blocked but some write access
	if readableSecrets == 0 && writesOutside <= 1 {
		return 3, "sensitive-path-blocklist", fmt.Sprintf(
			"All sensitive paths blocked (0/%d readable), limited write scope", totalSensitive)
	}

	// S:2 — Some sensitive paths blocked, some accessible
	if readableSecrets < totalSensitive/2 && writesOutside < 3 {
		return 2, "partial-fs-boundary", fmt.Sprintf(
			"Partial boundary: %d/%d sensitive paths readable, %d writes outside CWD",
			readableSecrets, totalSensitive, writesOutside)
	}

	// S:1 — Minimal restrictions
	if blockedSecrets > 0 || writesBlocked > 0 {
		return 1, "minimal-fs-restriction", fmt.Sprintf(
			"Minimal restrictions: %d/%d sensitive paths readable, %d writes outside CWD",
			readableSecrets, totalSensitive, writesOutside)
	}

	// S:0 — No restrictions
	return 0, "no-fs-boundary", fmt.Sprintf(
		"No filesystem boundary: %d/%d sensitive paths readable, writes unrestricted",
		readableSecrets, totalSensitive)
}

func sanitizeName(p string) string {
	p = strings.ReplaceAll(p, "/", "_")
	p = strings.ReplaceAll(p, "~", "home")
	p = strings.ReplaceAll(p, ".", "")
	p = strings.TrimLeft(p, "_")
	return p
}

// detectTmpfsMounts parses /proc/mounts to find tmpfs mount points.
func detectTmpfsMounts() []string {
	var mounts []string
	data, err := os.ReadFile("/proc/mounts")
	if err != nil {
		return mounts
	}
	for _, line := range strings.Split(string(data), "\n") {
		fields := strings.Fields(line)
		if len(fields) >= 3 && fields[2] == "tmpfs" {
			mounts = append(mounts, fields[1])
		}
	}
	return mounts
}

// isTmpfs checks if a path resides on a tmpfs mount.
func isTmpfs(path string, tmpfsMounts []string) bool {
	// Find the longest matching mount point
	bestMatch := ""
	for _, mount := range tmpfsMounts {
		if strings.HasPrefix(path, mount) && len(mount) > len(bestMatch) {
			bestMatch = mount
		}
	}
	return bestMatch != ""
}
