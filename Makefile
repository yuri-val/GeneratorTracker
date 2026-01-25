.PHONY: build-preview build-prod eas-build-preview eas-build-prod digest version-major version-minor version-patch help

help:
	@echo "Available commands:"
	@echo ""
	@echo "Build commands:"
	@echo "  make build-preview      - Build Android preview APK locally using Docker"
	@echo "  make build-prod         - Build Android production bundle locally using Docker"
	@echo "  make eas-build-preview  - Build Android preview APK remotely on EAS"
	@echo "  make eas-build-prod     - Build Android production bundle remotely on EAS"
	@echo ""
	@echo "Version management (Semantic Versioning):"
	@echo "  make version-major      - Bump MAJOR version (X.0.0) - breaking changes"
	@echo "  make version-minor      - Bump MINOR version (x.Y.0) - new features"
	@echo "  make version-patch      - Bump PATCH version (x.y.Z) - bug fixes"
	@echo ""
	@echo "Utilities:"
	@echo "  make digest             - Generate project digest using gitingest"

# Local builds using Docker
build-preview:
	docker compose up -d
	docker compose exec expo eas build --platform android --local --profile preview
	@mkdir -p builds/preview
	@mv -f *.apk builds/preview 2>/dev/null || true
	@echo "Build saved to builds/preview"

build-prod:
	docker compose up -d
	docker compose exec expo eas build --platform android --local --profile production
	@mkdir -p builds/production
	@mv -f *.aab builds/production 2>/dev/null || true
	@echo "Build saved to builds/production"

# Remote builds on EAS
eas-build-preview:
	eas build --platform android --profile preview

eas-build-prod:
	eas build --platform android --profile production

# Generate project digest
digest:
	gitingest .

# Version management (Semantic Versioning)
version-major:
	@./scripts/bump-version.sh major

version-minor:
	@./scripts/bump-version.sh minor

version-patch:
	@./scripts/bump-version.sh patch
