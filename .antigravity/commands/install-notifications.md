# Install RobOS Notifications

Use the `install-notifications` skill in `../skills/install-notifications/SKILL.md`
to install or verify desktop popups, login startup, and the Notifications history
app while retaining the workstation's existing RobOS data.

In Setup Wizard, use Step 11 → RobOS notification popups & history.
From the RobOS repository root, the terminal equivalent is:

```bash
node packages/robos-lib/notification-setup.js install
node packages/robos-lib/notification-setup.js test
node packages/robos-lib/notification-setup.js open
```
