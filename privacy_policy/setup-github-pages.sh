#!/bin/bash

# Setup script for deploying privacy policy to GitHub Pages
# This creates a separate gh-pages branch with only the privacy policy files

set -e

echo "🚀 Setting up GitHub Pages for Privacy Policy..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "en.md" ] || [ ! -f "uk.md" ]; then
    echo -e "${RED}❌ Error: en.md and uk.md not found${NC}"
    echo "Please run this script from the privacy_policy directory"
    exit 1
fi

# Check if pandoc is installed for markdown to HTML conversion
if ! command -v pandoc &> /dev/null; then
    echo -e "${YELLOW}⚠️  pandoc not found. Installing via homebrew...${NC}"
    if command -v brew &> /dev/null; then
        brew install pandoc
    else
        echo -e "${RED}❌ Error: Please install pandoc manually:${NC}"
        echo "  brew install pandoc"
        echo "  or visit: https://pandoc.org/installing.html"
        exit 1
    fi
fi

# Create temporary directory for gh-pages content
TEMP_DIR=$(mktemp -d)
echo -e "${GREEN}📁 Created temporary directory: $TEMP_DIR${NC}"

# Convert Markdown to HTML with a nice template
echo -e "${GREEN}📝 Converting Markdown to HTML...${NC}"

# Create HTML template
cat > "$TEMP_DIR/template.html" << 'EOF'
<!DOCTYPE html>
<html lang="$lang$">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>$title$ - Generator Tracker</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 {
            color: #FF6B35;
            font-size: 2.5em;
            margin-bottom: 0.5em;
            border-bottom: 3px solid #FF6B35;
            padding-bottom: 0.3em;
        }
        h2 {
            color: #2196F3;
            font-size: 1.8em;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
        }
        h3 {
            color: #555;
            font-size: 1.3em;
            margin-top: 1.2em;
            margin-bottom: 0.4em;
        }
        p {
            margin-bottom: 1em;
        }
        ul, ol {
            margin-left: 2em;
            margin-bottom: 1em;
        }
        li {
            margin-bottom: 0.5em;
        }
        strong {
            color: #FF6B35;
        }
        a {
            color: #2196F3;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        .emoji {
            font-size: 1.2em;
        }
        .last-updated {
            color: #666;
            font-style: italic;
            margin-bottom: 2em;
        }
        hr {
            border: none;
            border-top: 2px solid #eee;
            margin: 2em 0;
        }
        .footer {
            margin-top: 3em;
            padding-top: 2em;
            border-top: 2px solid #eee;
            text-align: center;
            color: #666;
            font-size: 0.9em;
        }
        .lang-switch {
            text-align: right;
            margin-bottom: 1em;
        }
        .lang-switch a {
            margin-left: 10px;
            padding: 5px 10px;
            background: #f0f0f0;
            border-radius: 5px;
            font-size: 0.9em;
        }
        @media (max-width: 768px) {
            body {
                padding: 10px;
            }
            .container {
                padding: 20px;
            }
            h1 {
                font-size: 2em;
            }
            h2 {
                font-size: 1.5em;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="lang-switch">
            <a href="privacy-policy.html">English</a>
            <a href="privacy-policy-uk.html">Українська</a>
        </div>
        $body$
        <div class="footer">
            <p>Generator Tracker | <a href="https://github.com/yuri-val/GeneratorTracker">GitHub</a> | <a href="mailto:yuri.valigursky@gmail.com">Contact</a></p>
        </div>
    </div>
</body>
</html>
EOF

# Convert English version
pandoc en.md \
    --from markdown \
    --to html5 \
    --standalone \
    --template="$TEMP_DIR/template.html" \
    --metadata title="Privacy Policy" \
    --metadata lang="en" \
    --output="$TEMP_DIR/privacy-policy.html"

echo -e "${GREEN}✅ Created privacy-policy.html${NC}"

# Convert Ukrainian version
pandoc uk.md \
    --from markdown \
    --to html5 \
    --standalone \
    --template="$TEMP_DIR/template.html" \
    --metadata title="Політика конфіденційності" \
    --metadata lang="uk" \
    --output="$TEMP_DIR/privacy-policy-uk.html"

echo -e "${GREEN}✅ Created privacy-policy-uk.html${NC}"

# Create index.html that redirects to English version
cat > "$TEMP_DIR/index.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url=privacy-policy.html">
    <title>Redirecting...</title>
</head>
<body>
    <p>Redirecting to <a href="privacy-policy.html">Privacy Policy</a>...</p>
</body>
</html>
EOF

echo -e "${GREEN}✅ Created index.html (redirect)${NC}"

# Save current directory and move to repository root
PRIVACY_POLICY_DIR=$(pwd)
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

echo -e "${GREEN}📁 Working from repository root: $REPO_ROOT${NC}"

# Get current git branch
CURRENT_BRANCH=$(git branch --show-current)

# Stash any uncommitted changes in current branch
STASHED=false
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}💾 Stashing uncommitted changes...${NC}"
    git stash push -m "Privacy policy setup: stashed changes from $CURRENT_BRANCH"
    STASHED=true
fi

# Check if gh-pages branch exists
if git rev-parse --verify gh-pages >/dev/null 2>&1; then
    echo -e "${GREEN}📋 gh-pages branch exists, switching to it...${NC}"
    git checkout gh-pages
    # Remove all tracked files from index
    git rm -rf . || true
else
    echo -e "${GREEN}🌿 Creating new gh-pages branch...${NC}"
    git checkout --orphan gh-pages
    # Remove everything from the index
    git rm -rf . || true
fi

# Remove all files except .git directory
find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} \;

# Create privacy_policy directory
mkdir -p privacy_policy

# Copy HTML files to privacy_policy directory
cp "$TEMP_DIR/privacy-policy.html" privacy_policy/
cp "$TEMP_DIR/privacy-policy-uk.html" privacy_policy/
cp "$TEMP_DIR/index.html" privacy_policy/

echo -e "${GREEN}📋 Copied HTML files to privacy_policy directory${NC}"

# Create .nojekyll file to prevent Jekyll processing
touch .nojekyll

# Add only the privacy_policy directory and .nojekyll
git add privacy_policy/ .nojekyll
git commit -m "Update privacy policy

Last updated: $(date +"%Y-%m-%d")

Generated from:
- privacy_policy/en.md
- privacy_policy/uk.md
"

echo -e "${GREEN}✅ Committed to gh-pages branch${NC}"

# Push to GitHub
echo -e "${YELLOW}📤 Pushing to GitHub...${NC}"
if git push origin gh-pages --force; then
    echo -e "${GREEN}✅ Successfully pushed to gh-pages branch${NC}"
else
    echo -e "${YELLOW}⚠️  First time push, setting upstream...${NC}"
    git push -u origin gh-pages --force
fi

# Switch back to original branch
echo -e "${GREEN}🔄 Switching back to $CURRENT_BRANCH...${NC}"
git checkout -f "$CURRENT_BRANCH"

# Pop stashed changes if any
if [ "$STASHED" = true ]; then
    echo -e "${GREEN}💾 Restoring stashed changes...${NC}"
    git stash pop
fi

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo -e "${GREEN}🎉 Privacy Policy deployed successfully!${NC}"
echo ""
echo "📍 Next steps:"
echo ""
echo "1. Enable GitHub Pages in repository settings:"
echo "   https://github.com/yuri-val/GeneratorTracker/settings/pages"
echo "   - Source: Deploy from branch"
echo "   - Branch: gh-pages"
echo "   - Folder: / (root)"
echo ""
echo "2. Your privacy policy will be available at:"
echo "   🇺🇸 English: https://yuri-val.github.io/GeneratorTracker/privacy_policy/privacy-policy.html"
echo "   🇺🇦 Ukrainian: https://yuri-val.github.io/GeneratorTracker/privacy_policy/privacy-policy-uk.html"
echo ""
echo "3. Add these URLs to:"
echo "   - app.json (privacy field)"
echo "   - Google Play Console (Store Listing > Privacy Policy)"
echo ""
echo -e "${YELLOW}⏳ Note: It may take a few minutes for GitHub Pages to build and deploy${NC}"
