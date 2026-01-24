.PHONY: build-preview build-prod eas-build-preview eas-build-prod help

help:
	@echo "Available commands:"
	@echo "  make build-preview      - Build Android preview APK locally using Docker"
	@echo "  make build-prod         - Build Android production bundle locally using Docker"
	@echo "  make eas-build-preview  - Build Android preview APK remotely on EAS"
	@echo "  make eas-build-prod     - Build Android production bundle remotely on EAS"

# Local builds using Docker
build-preview:
	docker compose exec expo eas build --platform android --local --profile preview
	@mkdir -p builds
	@mv -f *.apk builds/ 2>/dev/null || true
	@echo "Build saved to builds/"

build-prod:
	docker compose exec expo eas build --platform android --local --profile production
	@mkdir -p builds
	@mv -f *.aab builds/ 2>/dev/null || true
	@echo "Build saved to builds/"

# Remote builds on EAS
eas-build-preview:
	eas build --platform android --profile preview

eas-build-prod:
	eas build --platform android --profile production
