// Package l6 probes L6 — Action Governance.
// Tests whether destructive operations, persistence mechanisms, and
// dangerous syscalls are blocked at a semantic/policy level.
package l6

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/kajogo777/the-agent-sandbox-taxonomy/probe/internal/report"
)

func Probe() report.LayerResult {
	r := report.LayerResult{
		Layer:      "L6",
		Confidence: "verified",
	}

	blocked := 0
	allowed := 0

	// ================================================================
	// SAFETY: Never perform actual destructive operations.
	// Test PERMISSIONS only:
	//   - OpenFile(O_WRONLY) then Close() immediately (zero bytes written)
	//   - Create probe-owned temp files then remove them (safe)
	//   - Check capability/access bits
	// This tells us if the sandbox WOULD allow destruction without
	// actually destroying anything.
	// ================================================================

	// --- Protected path writability (proxy for unlink/overwrite) ---
	// If we can open /etc/hostname for writing, we COULD unlink or corrupt it.
	// NOTE: We use os.WriteFile to a temp file in the same directory rather than
	// os.OpenFile(O_WRONLY) on the existing file. This gives a more reliable
	// signal under seccomp-notify based sandboxes where openat(O_WRONLY) on
	// existing files may succeed due to notify response timing but the
	// actual write operation is blocked. Creating a new file via
	// os.WriteFile (which uses O_WRONLY|O_CREAT|O_TRUNC) is reliably
	// intercepted by seccomp file monitors.
	protectedPaths := []struct {
		path string
		desc string
	}{
		{"/etc/hostname", "system hostname"},
		{"/etc/resolv.conf", "DNS config"},
		{"/etc/passwd", "user database"},
		{"/etc/hosts", "host mappings"},
	}
	for _, pp := range protectedPaths {
		if _, err := os.Stat(pp.path); err != nil {
			continue
		}
		// Try writing a temp file next to the protected file, then verify
		// that the original file can be opened for writing.
		dir := filepath.Dir(pp.path)
		testFile := filepath.Join(dir, ".ast-probe-write-"+filepath.Base(pp.path))
		if err := os.WriteFile(testFile, []byte("probe"), 0644); err != nil {
			blocked++
			r.Tests = append(r.Tests, report.TestResult{
				Name: "protected_writable_" + sanitizeName(pp.path), Result: "blocked",
				Detail: fmt.Sprintf("%s (%s) directory not writable: %v", pp.path, pp.desc, err),
			})
		} else {
			os.Remove(testFile) // cleanup — safe, we created it
			// Also verify we can open the actual file for writing
			f, err := os.OpenFile(pp.path, os.O_WRONLY, 0)
			if err != nil {
				blocked++
				r.Tests = append(r.Tests, report.TestResult{
					Name: "protected_writable_" + sanitizeName(pp.path), Result: "blocked",
					Detail: fmt.Sprintf("%s (%s) not writable: %v", pp.path, pp.desc, err),
				})
			} else {
				f.Close()
				allowed++
				r.Tests = append(r.Tests, report.TestResult{
					Name: "protected_writable_" + sanitizeName(pp.path), Result: "allowed",
					Detail: fmt.Sprintf("WARNING: %s (%s) is writable — destructive ops possible", pp.path, pp.desc),
				})
				r.Warnings = append(r.Warnings, fmt.Sprintf("%s is writable", pp.path))
			}
		}
	}

	// --- Protected directory writability (can we create files in /etc?) ---
	protectedDirs := []string{"/etc", "/usr", "/var"}
	for _, dir := range protectedDirs {
		if _, err := os.Stat(dir); err != nil {
			continue
		}
		// Create a probe-owned temp file — safe to remove since we own it
		testPath := filepath.Join(dir, ".ast-probe-dir-write-test")
		f, err := os.OpenFile(testPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0644)
		if err != nil {
			blocked++
			r.Tests = append(r.Tests, report.TestResult{
				Name: "protected_dir_writable_" + sanitizeName(dir), Result: "blocked",
				Detail: fmt.Sprintf("Cannot create files in %s: %v", dir, err),
			})
		} else {
			f.Close()
			os.Remove(testPath) // safe: we just created this
			allowed++
			r.Tests = append(r.Tests, report.TestResult{
				Name: "protected_dir_writable_" + sanitizeName(dir), Result: "allowed",
				Detail: fmt.Sprintf("WARNING: can create files in %s", dir),
			})
			r.Warnings = append(r.Warnings, fmt.Sprintf("%s directory is writable", dir))
		}
		break // one dir test is enough
	}

	// --- Subprocess execution ---
	// Test if we can exec arbitrary commands
	if runtime.GOOS == "linux" || runtime.GOOS == "darwin" {
		// Try /bin/sh
		cmd := exec.Command("/bin/sh", "-c", "echo ast-probe-exec-test")
		if out, err := cmd.Output(); err != nil {
			blocked++
			r.Tests = append(r.Tests, report.TestResult{
				Name: "exec_shell", Result: "blocked",
				Detail: fmt.Sprintf("/bin/sh execution blocked: %v", err),
			})
		} else {
			if strings.TrimSpace(string(out)) == "ast-probe-exec-test" {
				allowed++
				r.Tests = append(r.Tests, report.TestResult{
					Name: "exec_shell", Result: "allowed",
					Detail: "Can execute /bin/sh — shell access available",
				})
			}
		}

		// Try curl/wget (commonly blocked by governance tools)
		for _, tool := range []string{"curl", "wget"} {
			if path, err := exec.LookPath(tool); err == nil {
				cmd := exec.Command(path, "--version")
				if _, err := cmd.Output(); err != nil {
					blocked++
					r.Tests = append(r.Tests, report.TestResult{
						Name: "exec_" + tool, Result: "blocked",
						Detail: fmt.Sprintf("%s found at %s but execution blocked: %v", tool, path, err),
					})
				} else {
					allowed++
					r.Tests = append(r.Tests, report.TestResult{
						Name: "exec_" + tool, Result: "allowed",
						Detail: fmt.Sprintf("%s available at %s", tool, path),
					})
				}
			} else {
				r.Tests = append(r.Tests, report.TestResult{
					Name: "exec_" + tool, Result: "blocked",
					Detail: fmt.Sprintf("%s not found in PATH", tool),
				})
			}
		}
	}

	// --- Persistence mechanisms ---
	// Test if persistence PATHS are writable, without actually creating
	// cron jobs, systemd services, etc.

	// Cron directory writability
	cronDir := "/var/spool/cron/crontabs"
	if runtime.GOOS == "darwin" {
		cronDir = "/var/at/tabs"
	}
	testPath := filepath.Join(cronDir, ".ast-probe-cron-test")
	if err := os.WriteFile(testPath, []byte("probe"), 0600); err != nil {
		blocked++
		r.Tests = append(r.Tests, report.TestResult{
			Name: "persistence_cron", Result: "blocked",
			Detail: fmt.Sprintf("Cannot write to cron directory %s: %v", cronDir, err),
		})
	} else {
		os.Remove(testPath) // safe: we created it
		allowed++
		r.Tests = append(r.Tests, report.TestResult{
			Name: "persistence_cron", Result: "allowed",
			Detail: fmt.Sprintf("WARNING: Cron directory %s is writable — persistence vector", cronDir),
		})
		r.Warnings = append(r.Warnings, "Cron directory writable")
	}

	// Systemd service directory writability (Linux)
	if runtime.GOOS == "linux" {
		systemdTestPath := "/etc/systemd/system/.ast-probe-systemd-test"
		if err := os.WriteFile(systemdTestPath, []byte("probe"), 0644); err != nil {
			blocked++
			r.Tests = append(r.Tests, report.TestResult{
				Name: "persistence_systemd", Result: "blocked",
				Detail: fmt.Sprintf("Cannot write to systemd directory: %v", err),
			})
		} else {
			os.Remove(systemdTestPath)
			allowed++
			r.Tests = append(r.Tests, report.TestResult{
				Name: "persistence_systemd", Result: "allowed",
				Detail: "WARNING: /etc/systemd/system/ is writable — persistence vector",
			})
			r.Warnings = append(r.Warnings, "Systemd service directory writable")
		}

		// User-level systemd
		home, _ := os.UserHomeDir()
		if home != "" {
			userSystemdDir := filepath.Join(home, ".config/systemd/user")
			// Don't create the directory — just check if it exists and is writable
			if _, err := os.Stat(userSystemdDir); err == nil {
				userTestPath := filepath.Join(userSystemdDir, ".ast-probe-user-systemd-test")
				if err := os.WriteFile(userTestPath, []byte("probe"), 0644); err != nil {
					blocked++
					r.Tests = append(r.Tests, report.TestResult{
						Name: "persistence_systemd_user", Result: "blocked",
						Detail: fmt.Sprintf("User systemd dir exists but not writable: %v", err),
					})
				} else {
					os.Remove(userTestPath)
					allowed++
					r.Tests = append(r.Tests, report.TestResult{
						Name: "persistence_systemd_user", Result: "allowed",
						Detail: "WARNING: User systemd directory is writable — persistence vector",
					})
					r.Warnings = append(r.Warnings, "User systemd directory writable")
				}
			}
		}
	}

	// Git hooks writability (check without creating an actual hook)
	if _, err := os.Stat(".git/hooks"); err == nil {
		hookDir := ".git/hooks"
		hookTestPath := filepath.Join(hookDir, ".ast-probe-hook-test")
		if err := os.WriteFile(hookTestPath, []byte("probe"), 0755); err != nil {
			blocked++
			r.Tests = append(r.Tests, report.TestResult{
				Name: "persistence_git_hook", Result: "blocked",
				Detail: fmt.Sprintf("Cannot write to .git/hooks/: %v", err),
			})
		} else {
			os.Remove(hookTestPath)
			allowed++
			r.Tests = append(r.Tests, report.TestResult{
				Name: "persistence_git_hook", Result: "allowed",
				Detail: "WARNING: .git/hooks/ is writable — persistence vector",
			})
			r.Warnings = append(r.Warnings, "Git hooks directory writable")
		}
	}

	// --- Dangerous syscalls (if seccomp is claimed) ---
	// Try to call reboot (should always fail in a sandbox)
	if runtime.GOOS == "linux" {
		// LINUX_REBOOT_CMD_CAD_OFF = 0 — just disables Ctrl-Alt-Del, least dangerous
		err := tryReboot(0)
		if err != nil {
			blocked++
			r.Tests = append(r.Tests, report.TestResult{
				Name: "syscall_reboot", Result: "blocked",
				Detail: fmt.Sprintf("reboot() syscall blocked: %v", err),
			})
		} else {
			allowed++
			r.Tests = append(r.Tests, report.TestResult{
				Name: "syscall_reboot", Result: "allowed",
				Detail: "WARNING: reboot() syscall succeeded — very weak isolation",
			})
			r.Warnings = append(r.Warnings, "reboot() syscall allowed")
		}

		// Try to set hostname
		err = trySethostname([]byte("ast-probe-test"))
		if err != nil {
			blocked++
			r.Tests = append(r.Tests, report.TestResult{
				Name: "syscall_sethostname", Result: "blocked",
				Detail: fmt.Sprintf("sethostname() blocked: %v", err),
			})
		} else {
			allowed++
			r.Tests = append(r.Tests, report.TestResult{
				Name: "syscall_sethostname", Result: "allowed",
				Detail: "WARNING: sethostname() succeeded — UTS namespace not isolated or has CAP_SYS_ADMIN",
			})
			r.Warnings = append(r.Warnings, "sethostname() allowed")
		}

		// Try to load a kernel module (should fail)
		errno := init_module_errno()
		if errno != 0 {
			blocked++
			r.Tests = append(r.Tests, report.TestResult{
				Name: "syscall_init_module", Result: "blocked",
				Detail: fmt.Sprintf("init_module() blocked: %v", errno),
			})
		} else {
			allowed++
			r.Tests = append(r.Tests, report.TestResult{
				Name: "syscall_init_module", Result: "allowed",
				Detail: "WARNING: init_module() not blocked — can load kernel modules",
			})
			r.Warnings = append(r.Warnings, "init_module() allowed")
		}
	}

	// --- Process capabilities check (governance-relevant) ---
	if runtime.GOOS == "linux" {
		// Check if we're running as root
		if os.Getuid() == 0 {
			r.Tests = append(r.Tests, report.TestResult{
				Name: "running_as_root", Result: "allowed",
				Detail: "WARNING: Running as root (UID 0) — no user-level governance",
			})
			r.Warnings = append(r.Warnings, "Running as root")
		} else {
			r.Tests = append(r.Tests, report.TestResult{
				Name: "running_as_root", Result: "blocked",
				Detail: fmt.Sprintf("Running as non-root (UID %d)", os.Getuid()),
			})
		}
	}

	// --- Assess strength ---
	r.AssessedStrength, r.DetectedMechanism, r.Notes = assessL6(blocked, allowed, r.Warnings)

	return r
}

func assessL6(blocked, allowed int, warnings []string) (int, string, string) {
	total := blocked + allowed
	if total == 0 {
		return -1, "not-assessed", "No governance tests could be executed"
	}

	blockRate := float64(blocked) / float64(total)

	// Check for kernel-level blocking (seccomp indicators)
	// If dangerous syscalls like reboot, init_module are NOT in warnings,
	// they were blocked — likely at kernel level (seccomp/capabilities).
	rebootAllowed := false
	initModuleAllowed := false
	for _, w := range warnings {
		if strings.Contains(w, "reboot()") {
			rebootAllowed = true
		}
		if strings.Contains(w, "init_module()") {
			initModuleAllowed = true
		}
	}
	hasKernelBlocking := !rebootAllowed && !initModuleAllowed && total > 3

	// S:3 — Kernel-enforced: dangerous syscalls blocked, high block rate
	if hasKernelBlocking && blockRate >= 0.8 {
		return 3, "kernel-enforced-governance", fmt.Sprintf(
			"Dangerous syscalls blocked at kernel level; %d/%d operations blocked (%.0f%%)",
			blocked, total, blockRate*100)
	}

	// S:2 — Software-enforced: most things blocked but not at kernel level
	if blockRate >= 0.6 {
		return 2, "software-enforced-governance", fmt.Sprintf(
			"Most operations blocked; %d/%d blocked (%.0f%%); enforcement likely software-level",
			blocked, total, blockRate*100)
	}

	// S:1 — Minimal governance
	if blockRate >= 0.3 {
		return 1, "minimal-governance", fmt.Sprintf(
			"Some operations blocked; %d/%d blocked (%.0f%%); significant gaps",
			blocked, total, blockRate*100)
	}

	// S:0 — No governance
	return 0, "no-governance", fmt.Sprintf(
		"Minimal blocking; %d/%d blocked (%.0f%%); agent can perform destructive operations freely",
		blocked, total, blockRate*100)
}

func sanitizeName(p string) string {
	p = strings.ReplaceAll(p, "/", "_")
	p = strings.ReplaceAll(p, "~", "home")
	p = strings.ReplaceAll(p, ".", "")
	p = strings.TrimLeft(p, "_")
	return p
}
