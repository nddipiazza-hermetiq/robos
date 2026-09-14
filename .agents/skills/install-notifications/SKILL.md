---
name: install-notifications
description: Install or verify RobOS desktop notification panel bell, popups, login startup, and the Notifications history app on an existing Linux workstation. Reuses the existing RobOS checkout and preserves history and preferences.
---

# Install RobOS Notifications

Use the existing RobOS checkout containing `packages/robos-lib/notification-setup.js`.
Run from a logged-in Linux desktop session. The setup needs Node.js and an Electron
runtime; it reuses the runtime from robos-toast, robos-graph, or robos-onboarding.
If none exists, run `npm install --prefix packages/robos-toast` in that checkout.
Keep the checkout at its current path: the installed launchers point to it.

## GUI onboarding

Open RobOS Setup Wizard → Step 11 → **RobOS notification popups & history**.
Click **Install & Start Notifications**, then **Send Test Popup** and
**Open Notifications**. Confirm the actual popup and the matching history entry.
A saved history entry alone is not proof that a popup appeared.

## Terminal equivalent

From the RobOS repository root:

```bash
node packages/robos-lib/notification-setup.js status
node packages/robos-lib/notification-setup.js install
node packages/robos-lib/notification-setup.js test
node packages/robos-lib/notification-setup.js open
```

The installer creates user-local `robos-toast` and `robos-notifications` launchers,
`~/.config/autostart/robos-toast.desktop`, and an application-menu entry for
Notifications. It starts the popup daemon in the background and checks readiness.
It updates only files marked as owned by this installer; existing custom launchers
cause a clear conflict without replacing them. Inspect and reuse those existing
launchers, or resolve the named conflict with the user when replacement is needed.
No sudo or full RobOS VM provisioning is required.

Preserve `~/.config/robos/notifications.json` and `notification-prefs.json`.
Do not clear history, reset onboarding, enable global desktop banners, or disable
Do Not Disturb just to make verification pass. If Do Not Disturb suppresses the
popup, explain that history verification passed but visual verification is pending.
Startup failures are logged in `~/.config/robos/notification-service.log`.

Report runtime status, login startup status, and the observed popup/history result.
A configured autostart entry is not proof of a successful future login; verify that
on the next normal desktop login without forcing the user to log out now.

The running popup daemon also owns a permanent RobOS bell in the desktop panel.
Click it (or choose **Open Notifications** from its menu) to open history.
On Ubuntu GNOME, check `gnome-extensions list --enabled` for
`ubuntu-appindicators@ubuntu.com` if the bell is absent. Do not claim panel
visibility from a popup screenshot: verify the StatusNotifierItem registration
and the desktop panel separately. Other GNOME distributions may need an
AppIndicator extension; identify the desktop before installing one.
