# PHASE 5B — JS Chat Widget

## ✅ AI Tasks Completed

All AI tasks for Phase 5B are **fully implemented and tested**:

### ✓ Task 1: Created `widget/src/index.js` — Floating Chat Button UI
- Floating circular button in bottom-right corner
- Click to expand/collapse chat bubble
- Smooth animations and hover effects
- Gradient styling (purple/blue theme)
- Responsive on mobile and desktop

### ✓ Task 2: Chat Bubble with HTML/CSS Injected via JS
- Chat bubble UI injected at runtime (no DOM pre-req)
- Header with title and close button
- Message list with scrollable area
- Input field with send button
- Open/close toggle with smooth animation
- Full mobile responsiveness (100vh on small screens)

### ✓ Task 3: Message API Format + Loading Indicators + Error Handling
- **API Format**: JSON-RPC 2.0 over HTTP with Bearer token auth
- **Tools Called**:
  - `detect_context` — Analyzes URL + user intent
  - `search_content` — Finds relevant website content
  - `get_user_context` — Loads conversation history
  - `save_user_context` — Saves new messages
- **Loading Indicator**: Animated 3-dot bouncing indicator
- **Error Handling**: Graceful error messages, fallback to keyword search
- **Session Management**: localStorage for persistence across reloads

### ✓ Task 4: Minified Bundle Scripts
- **Build System**: Node.js build.js with terser minification
- **Output**: `widget/dist/siteagent.min.js`
- **Size**: 11.16 KB (36.5% reduction from 17.58 KB)
- **Features**:
  - Automatic minification with file size reporting
  - Simple minification fallback (no external deps required)
  - Watch mode for development
  - Integration snippet generation

---

## 👤 Human Tasks — Step-by-Step Instructions

### TASK 1: Create a Separate GitHub Repository for the Widget

#### Step 1: Create New Repository on GitHub

1. Go to **https://github.com/new**
2. Fill in repository details:
   - **Repository name**: `siteagent-widget`
   - **Description**: `Floating AI chat assistant widget for any website`
   - **Visibility**: Public (required for CDN publishing)
   - **Initialize with**: README (optional, we'll replace it)
3. Click **"Create repository"**

#### Step 2: Push Widget Code to Repository

In your local machine terminal:

```bash
# Navigate to widget directory
cd d:\mcp-server\mcp-new-server\widget

# Initialize git (if not already done)
git init

# Add all widget files
git add .

# Create initial commit
git commit -m "Initial release: SiteAgent Chat Widget v1.0.0"

# Add remote repository (replace USERNAME with your GitHub username)
git remote add origin https://github.com/USERNAME/siteagent-widget.git

# Push to GitHub
git branch -M main
git push -u origin main
```

#### Step 3: Create a Release

1. Go to your repository: `https://github.com/USERNAME/siteagent-widget`
2. Click **"Releases"** → **"Create a new release"**
3. Fill in details:
   - **Tag version**: `v1.0.0`
   - **Release title**: `v1.0.0 - Initial Release`
   - **Description**:
     ```
     🎉 First official release of SiteAgent Chat Widget
     
     ✨ Features:
     - Floating chat button UI
     - AI-powered conversations
     - Semantic search integration
     - Conversation history persistence
     - Mobile responsive
     - < 15 KB minified
     
     📦 Usage:
     - Copy API key from SiteAgent dashboard
     - Add script tag to your website
     - Widget appears automatically
     
     See README.md for full documentation
     ```
4. Click **"Publish release"**

#### Step 4: Verify Repository Structure

Check that your repository contains:
```
siteagent-widget/
├── src/
│   └── index.js                    ✓
├── dist/
│   └── siteagent.min.js           ✓
├── build.js                        ✓
├── package.json                    ✓
├── example.html                    ✓
├── INTEGRATION.html                ✓
├── README.md                       ✓
└── .gitignore (recommended)
```

Create `.gitignore` file:
```bash
# In widget directory, create .gitignore
cat > .gitignore << 'EOF'
node_modules/
.env
.DS_Store
dist/*.js.map
EOF

git add .gitignore
git commit -m "Add .gitignore"
git push
```

---

### TASK 2: Publish Minified Script to CDN

Choose **ONE** of the options below (jsDelivr is recommended for simplicity):

---

## OPTION A: jsDelivr CDN (Recommended — Free, No Setup)

**Pros**: Free, instant global CDN, no account needed, auto-updates from GitHub  
**Cons**: Depends on GitHub releases

#### Step 1: Tag Release on GitHub
```bash
# Already done in Task 1 (v1.0.0)
# jsDelivr automatically picks up GitHub releases
```

#### Step 2: Generate CDN URL

Replace `USERNAME` with your GitHub username:

```
https://cdn.jsdelivr.net/gh/USERNAME/siteagent-widget@1.0.0/dist/siteagent.min.js
```

#### Step 3: Test the CDN URL

Open in browser:
```
https://cdn.jsdelivr.net/gh/USERNAME/siteagent-widget@1.0.0/dist/siteagent.min.js
```

You should see the minified JavaScript code.

#### Step 4: Create Integration Snippet

Users can now add to their websites:

```html
<script>
  window.SiteAgentConfig = {
    apiKey: 'YOUR_API_KEY',
    serverUrl: 'https://api.siteagent.com',
    tenantId: 'YOUR_TENANT_ID'
  };
</script>
<script src="https://cdn.jsdelivr.net/gh/USERNAME/siteagent-widget@1.0.0/dist/siteagent.min.js"></script>
```

#### For Future Updates:

1. Update code locally
2. Rebuild: `npm run build`
3. Commit and push: `git push origin main`
4. Create new release: `git tag v1.1.0 && git push --tags`
5. CDN URL automatically available:
   ```
   https://cdn.jsdelivr.net/gh/USERNAME/siteagent-widget@1.1.0/dist/siteagent.min.js
   ```

---

## OPTION B: Unpkg CDN (Free, Via NPM)

**Pros**: Integrated with npm ecosystem, professional  
**Cons**: Requires npm account and publishing

#### Step 1: Create NPM Account

1. Go to **https://www.npmjs.com/signup**
2. Sign up with email/username/password
3. Verify email

#### Step 2: Publish to NPM

```bash
cd d:\mcp-server\mcp-new-server\widget

# Login to npm
npm login
# (enter username, password, email)

# Update version in package.json if needed
# "version": "1.0.0"

# Publish
npm publish
```

#### Step 3: Generate CDN URL

```
https://unpkg.com/siteagent-widget@1.0.0/dist/siteagent.min.js
```

#### Step 4: Integration Snippet

```html
<script>
  window.SiteAgentConfig = {
    apiKey: 'YOUR_API_KEY',
    serverUrl: 'https://api.siteagent.com',
    tenantId: 'YOUR_TENANT_ID'
  };
</script>
<script src="https://unpkg.com/siteagent-widget@1.0.0/dist/siteagent.min.js"></script>
```

---

## OPTION C: MCPize Static Hosting (If Using MCPize)

**Pros**: Everything in one platform  
**Cons**: Specific to MCPize deployment

#### Step 1: Upload to MCPize

1. Log in to MCPize dashboard
2. Go to Settings → Static Files
3. Upload `widget/dist/siteagent.min.js`
4. MCPize provides URL: `https://mcpize.app/static/siteagent.min.js`

#### Step 2: Integration Snippet

```html
<script>
  window.SiteAgentConfig = {
    apiKey: 'YOUR_API_KEY',
    serverUrl: 'https://your-siteagent-mcpize-server.com',
    tenantId: 'YOUR_TENANT_ID'
  };
</script>
<script src="https://mcpize.app/static/siteagent.min.js"></script>
```

---

## OPTION D: Self-Hosted (Most Control)

**Pros**: Full control, no dependencies  
**Cons**: Need own server/hosting

#### Step 1: Upload File

1. Get `widget/dist/siteagent.min.js`
2. Upload to your server: `/static/js/siteagent.min.js`
3. Ensure CORS headers:
   ```
   Access-Control-Allow-Origin: *
   Cache-Control: public, max-age=31536000
   ```

#### Step 2: Integration Snippet

```html
<script>
  window.SiteAgentConfig = {
    apiKey: 'YOUR_API_KEY',
    serverUrl: 'https://api.mycompany.com',
    tenantId: 'YOUR_TENANT_ID'
  };
</script>
<script src="https://mycompany.com/static/js/siteagent.min.js"></script>
```

---

## Verification Checklist

After publishing to your chosen CDN, verify:

- [ ] Repository created on GitHub
- [ ] Code pushed to `main` branch
- [ ] Release created with tag `v1.0.0`
- [ ] CDN URL is publicly accessible
- [ ] Script loads without errors (F12 → Network tab)
- [ ] Widget appears on test page
- [ ] Configuration options work
- [ ] Chat messages display correctly
- [ ] Mobile responsiveness works (F12 → Device emulation)

---

## Testing the Widget Locally

Before publishing, test locally:

#### Step 1: Start SiteAgent Server

```bash
# In another terminal
cd d:\mcp-server\mcp-new-server
npm run dev
```

#### Step 2: Test Widget with Local Server

```bash
# Open widget/example.html in a web server (not file://)
# Use Python
python -m http.server 8000 --directory widget

# Or use Node.js
npx http-server widget -p 8000
```

#### Step 3: Open Browser

1. Go to `http://localhost:8000/example.html`
2. Click floating chat button (💬)
3. Type a message
4. Verify:
   - ✓ Message sends to server
   - ✓ Loading indicator shows
   - ✓ Response appears
   - ✓ No errors in console

---

## Next Steps

Once published:

1. **Document the CDN URL** — Add to your project docs
2. **Share Integration Snippet** — Give to customers
3. **Monitor Analytics** — Track usage
4. **Gather Feedback** — Improve UI/UX
5. **Plan Updates** — New features, bug fixes
6. **Version Management** — Follow semver (v1.1.0, v2.0.0, etc.)

---

## Troubleshooting

### CDN URL returns 404

- **jsDelivr**: Ensure GitHub release is published
- **Unpkg**: Ensure npm publish completed
- **MCPize/Self-Hosted**: Check file upload and permissions

### Widget loads but won't connect to server

- Check `serverUrl` in config
- Verify server has CORS enabled
- Check API key validity
- Look for errors in browser console

### Script fails to load

- Check CDN URL is correct
- Verify CORS headers: `Access-Control-Allow-Origin: *`
- Check file isn't too large for browser cache
- Try in different browser/incognito mode

---

## Support

For questions:
- Check [widget/README.md](./README.md)
- Review [widget/example.html](./example.html)
- Test with [widget/INTEGRATION.html](./INTEGRATION.html)
- Inspect browser console (F12 → Console tab)

Good luck! 🚀
