#!/bin/bash

# Semantic Versioning Bump Script
# Usage: ./scripts/bump-version.sh [major|minor|patch]

set -e

VERSION_TYPE=${1:-patch}

if [[ ! "$VERSION_TYPE" =~ ^(major|minor|patch)$ ]]; then
  echo "Error: Version type must be 'major', 'minor', or 'patch'"
  echo "Usage: $0 [major|minor|patch]"
  exit 1
fi

# Read current version from app.json
CURRENT_VERSION=$(grep '"version":' app.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')

echo "Current version: $CURRENT_VERSION"

# Split version into components
IFS='.' read -r -a VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR="${VERSION_PARTS[0]}"
MINOR="${VERSION_PARTS[1]}"
PATCH="${VERSION_PARTS[2]}"

# Bump version based on type
case $VERSION_TYPE in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"

echo "New version: $NEW_VERSION"

# Update app.json
sed -i.bak "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" app.json
rm app.json.bak

# Update package.json
sed -i.bak "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json
rm package.json.bak

# Increment iOS buildNumber
IOS_BUILD=$(grep '"buildNumber":' app.json | sed 's/.*"buildNumber": "\(.*\)".*/\1/')
NEW_IOS_BUILD=$((IOS_BUILD + 1))
sed -i.bak "s/\"buildNumber\": \"$IOS_BUILD\"/\"buildNumber\": \"$NEW_IOS_BUILD\"/" app.json
rm app.json.bak

# Increment Android versionCode
ANDROID_CODE=$(grep '"versionCode":' app.json | sed 's/.*"versionCode": \(.*\),.*/\1/')
NEW_ANDROID_CODE=$((ANDROID_CODE + 1))
sed -i.bak "s/\"versionCode\": $ANDROID_CODE/\"versionCode\": $NEW_ANDROID_CODE/" app.json
rm app.json.bak

echo ""
echo "Version updated successfully!"
echo "  Version: $CURRENT_VERSION → $NEW_VERSION"
echo "  iOS buildNumber: $IOS_BUILD → $NEW_IOS_BUILD"
echo "  Android versionCode: $ANDROID_CODE → $NEW_ANDROID_CODE"
echo ""
echo "Files updated:"
echo "  - app.json"
echo "  - package.json"
