# companion-module-tascam-cd

See [HELP.md](./companion/HELP.md) and [LICENSE](./LICENSE)

## Version History

### Version 3.0.0

- Requires Companion 5.1 or later (module API 2.2)
- Action and feedback options can be expressions
- Password config field stored as a module secret
- Direct Track Search takes a number; existing buttons are converted
- Track Time mode is now a connection setting
- Add Play State variable
- Reconnects to a unit that stops responding without closing the connection
- A wrong password is sent once per connection, rather than every time the unit asks
- Feedbacks and variables only update when the unit reports a change
- Converted to TypeScript, with unit tests
- Reset state on disconnect
- Fix: syncRecLevelPreset commands
- Fix: End of Media feedback crash

### Version 2.1.6

- Fix some queries on connection

### Version 2.1.5

- Update Node 22

### Version 2.1.4

- Update dependencies
- Minor fixes

### Version 2.1.3

- Fix password regex

### Version 2.1.2

- Better status updates
- Better preset formatting
- Update companion-module-base to 1.8.0

### Version 2.1.1

- Add record preset

### Version 2.1.0

- Add device, status and transport presets

### Version 2.0.3

- End of Media feedback
- Track Number & Track Time variable fixes
- Track Time mode saved to device config
- Update companion-module-tools to 1.5.0

### Version 2.0.2

- Minor fixes

### Version 2.0.1

- Add action & feedback subscription callbacks
- Update package.json
- Update companion-module-base to 1.7.0

### Version 2.0.0

- Brand new module vs 1.0.0
