# Grace Class - GitHub Activity Tracker for Educators

## Project Overview

A React application that integrates with GitHub to help computer science teachers track student activity including comments, commits, PRs, discussions, and issues across any repository or organization.

### Tech Stack
- **Frontend**: React 19 + Vite + TypeScript
- **Backend**: Convex
- **Authentication**: WorkOS AuthKit (already set up)
- **GitHub Integration**: OAuth App
- **Styling**: TailwindCSS
- **Deployment**: Vercel

### Key Features
- GitHub OAuth integration for API access
- Multiple class/semester management
- Import students from GitHub organization members
- Organize students into classes
- Track all student GitHub activity:
  - PR review comments
  - Issue comments
  - Commit comments
  - Discussion comments
  - Commits
  - Pull Requests
  - Issues
  - Discussions
- Activity summaries per student
- Activity timelines

---

## Implementation Plan

### Phase 1: GitHub OAuth Integration
**Goal**: Allow the teacher to connect their GitHub account to fetch student data.

- [x] **1.1** Set up environment variables for GitHub OAuth
  - `GITHUB_CLIENT_ID` (Convex env var)
  - `GITHUB_CLIENT_SECRET` (Convex env var)
  - `FRONTEND_URL` (Convex env var - for OAuth redirect)
- [x] **1.2** Create Convex schema for storing GitHub connection
  - `githubConnections` table (userId, accessToken, githubUsername, githubId, avatarUrl, connectedAt)
- [x] **1.3** Create GitHub OAuth flow
  - Frontend: "Connect GitHub" button that redirects to GitHub OAuth
  - Backend: Convex HTTP action to handle OAuth callback and exchange code for token
  - Created `convex/github.ts` with queries and mutations
  - Created `convex/http.ts` with OAuth callback handler
- [x] **1.4** Create UI to show GitHub connection status
  - Created `GitHubConnection` component with connect/disconnect buttons
  - Created `GitHubCallback` page to handle OAuth redirect
  - Created `Dashboard` page with GitHub integration section
- [ ] **1.5** Test OAuth flow end-to-end

### Phase 2: Organization & Student Management
**Goal**: Fetch organization members and allow organizing them into classes.

- [ ] **2.1** Design and implement Convex schema
  - `organizations` table (name, githubId, url)
  - `classes` table (name, organizationId, year, createdAt)
  - `students` table (classIds[], name, githubUsername, githubId, avatarUrl)
- [ ] **2.2** Create Organization management UI
  - "Add Organization" - enter org URL/name
  - Fetch and display org members from GitHub API
  - Store organization and members in Convex
- [ ] **2.3** Create Class management UI
  - List all classes
  - Create new class form (linked to an organization)
  - Edit/delete class
- [ ] **2.4** Create Student assignment UI
  - View all students from organization(s)
  - Assign/unassign students to classes
  - View students by class
- [ ] **2.5** Test organization fetch and class assignment operations

### Phase 3: GitHub Activity Fetching
**Goal**: Fetch and cache student activity from GitHub API.

- [ ] **3.1** Create Convex schema for cached activity
  - `activities` table (studentId, type, data, githubId, createdAt, fetchedAt)
- [ ] **3.2** Implement GitHub API service layer
  - Rate limit handling and status display
  - Pagination support
- [ ] **3.3** Implement activity fetching for each type:
  - [ ] Commits (via Events API or Search API)
  - [ ] Pull Requests
  - [ ] Issues
  - [ ] PR Review Comments
  - [ ] Issue Comments
  - [ ] Commit Comments
  - [ ] Discussions (GraphQL API)
- [ ] **3.4** Create "Refresh Activity" action per student/class
- [ ] **3.5** Store fetched activities in Convex for caching
- [ ] **3.6** Display rate limit status in UI

### Phase 4: Activity Display & Summaries
**Goal**: Show activity summaries and timelines for students.

- [ ] **4.1** Create Student Activity Summary component
  - Total counts by activity type
  - Activity breakdown chart/visualization
  - Date range filtering
- [ ] **4.2** Create Activity Timeline component
  - Chronological list of all activities
  - Filter by activity type
  - Expandable details for each activity
- [ ] **4.3** Create Class Overview dashboard
  - Summary of all students' activity
  - Quick stats (most active, least active, etc.)
- [ ] **4.4** Add date range filtering across the app
- [ ] **4.5** Polish UI/UX and responsive design

### Phase 5: Polish & Deployment
**Goal**: Prepare for production deployment.

- [ ] **5.1** Add loading states and error handling throughout
- [ ] **5.2** Add empty states for no data scenarios
- [ ] **5.3** Configure Vercel deployment
- [ ] **5.4** Set up production environment variables
- [ ] **5.5** Test full flow in production
- [ ] **5.6** Documentation for GitHub OAuth App setup

---

## GitHub OAuth App Setup Instructions

When ready to implement, the teacher will need to:

1. Go to GitHub Settings → Developer settings → OAuth Apps → New OAuth App
2. Fill in:
   - **Application name**: Grace Class (or preferred name)
   - **Homepage URL**: Your deployed URL (e.g., `https://grace-class.vercel.app`)
   - **Authorization callback URL**: `https://<your-convex-deployment>.convex.site/api/github/callback`
     - Get this URL from your Convex dashboard under "Settings" → "URL & Deploy Key"
3. Save the Client ID and generate a Client Secret
4. Add these environment variables to Convex (via dashboard or CLI):
   - `GITHUB_CLIENT_ID` - Your OAuth App's Client ID
   - `GITHUB_CLIENT_SECRET` - Your OAuth App's Client Secret
   - `FRONTEND_URL` - Your frontend URL (e.g., `https://grace-class.vercel.app` or `http://localhost:5173` for dev)

**Important**: The callback URL must point to your Convex HTTP endpoint, NOT your frontend URL. Update your GitHub OAuth App settings accordingly.

---

## API Rate Limit Strategy

GitHub API limits:
- **Authenticated requests**: 5,000/hour
- **Search API**: 30 requests/minute

Mitigation strategies:
1. Cache all fetched data in Convex
2. Show "Last fetched" timestamp
3. Manual refresh buttons (no auto-polling)
4. Display remaining rate limit in UI
5. Batch requests where possible
6. Use conditional requests (If-Modified-Since) where supported

---

## Data Models (Convex Schema)

```typescript
// Planned schema structure

githubConnections: {
  userId: string,           // WorkOS user ID
  accessToken: string,      // Encrypted GitHub token
  githubUsername: string,
  githubId: number,
  connectedAt: number,
}

organizations: {
  userId: string,           // Owner (teacher)
  name: string,             // Org name
  githubId: number,
  url: string,
  avatarUrl?: string,
  addedAt: number,
}

classes: {
  userId: string,           // Owner (teacher)
  organizationId: Id<"organizations">,
  name: string,
  year: number,
  createdAt: number,
}

students: {
  userId: string,           // Owner (teacher)
  organizationId: Id<"organizations">,
  classIds: Id<"classes">[], // Can be in multiple classes
  name: string,
  githubUsername: string,
  githubId: number,
  avatarUrl?: string,
  addedAt: number,
}

activities: {
  studentId: Id<"students">,
  type: "commit" | "pr" | "issue" | "pr_comment" | "issue_comment" | "commit_comment" | "discussion" | "discussion_comment",
  githubId: string,         // Unique GitHub identifier
  title?: string,
  body?: string,
  url: string,
  repoFullName: string,
  activityCreatedAt: number, // When it happened on GitHub
  fetchedAt: number,         // When we fetched it
  rawData: object,           // Full GitHub API response
}
```

---

## Progress Tracking

| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| Phase 1: GitHub OAuth | 🟡 In Progress | ✓ | - |
| Phase 2: Class & Student Management | ⬜ Not Started | - | - |
| Phase 3: GitHub Activity Fetching | ⬜ Not Started | - | - |
| Phase 4: Activity Display & Summaries | ⬜ Not Started | - | - |
| Phase 5: Polish & Deployment | ⬜ Not Started | - | - |

---

## Notes & Decisions

- **OAuth vs GitHub App**: Chose OAuth for simplicity. GitHub App would be needed if we wanted webhooks for real-time updates, but MVP uses manual refresh.
- **Data Storage**: Caching in Convex to reduce API calls and provide faster load times.
- **Student Import**: Using GitHub API to fetch organization members instead of CSV import. Teacher provides org URL, we fetch members and let them organize into classes.
- **Multi-class Students**: Students can belong to multiple classes (e.g., same student in different semesters).
- **Multi-tenancy**: Schema supports multiple teachers, but auth currently assumes single user.
