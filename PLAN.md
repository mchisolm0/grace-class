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

### Phase 1: GitHub OAuth Integration ✅
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
- [x] **1.5** Test OAuth flow end-to-end

### Phase 2: Organization & Student Management ✅
**Goal**: Fetch organization members and allow organizing them into classes.

- [x] **2.1** Design and implement Convex schema
  - `organizations` table (name, githubId, url)
  - `classes` table (name, organizationId, year, createdAt)
  - `students` table (classIds[], name, githubUsername, githubId, avatarUrl)
  - Created `convex/organizations.ts` with list, get, add, remove, fetchMembers, searchUserOrgs
  - Created `convex/classes.ts` with list, get, create, update, remove, getStudentCount
  - Created `convex/students.ts` with list, listByOrganization, listByClass, assignToClass, removeFromClass, etc.
- [x] **2.2** Create Organization management UI
  - "Add Organization" modal that searches user's GitHub orgs
  - Fetch and display org members from GitHub API via "Sync Members" button
  - Store organization and members in Convex
  - Created `src/pages/Organizations.tsx`
- [x] **2.3** Create Class management UI
  - List all classes with student counts
  - Create new class form (linked to an organization)
  - Delete class functionality
  - Created `src/pages/Classes.tsx`
- [x] **2.4** Create Student assignment UI
  - View all students from organization
  - Assign/unassign students to classes via modal with search/select all
  - View students by class with remove option
  - Created `src/pages/ClassDetail.tsx`
- [x] **2.5** Test organization fetch and class assignment operations

### Phase 3: GitHub Activity Fetching ✅
**Goal**: Fetch and cache student activity from GitHub API.

- [x] **3.1** Create Convex schema for cached activity
  - `activities` table (studentId, type, data, githubId, createdAt, fetchedAt)
  - Schema already existed from Phase 2
- [x] **3.2** Implement GitHub API service layer
  - Rate limit handling and status display
  - Pagination support
  - Created `convex/activities.ts` with helper functions for GitHub API
- [x] **3.3** Implement activity fetching for each type:
  - [x] Commits (via Events API - PushEvent)
  - [x] Pull Requests (via Search API)
  - [x] Issues (via Search API)
  - [x] PR Review Comments (via Events API - PullRequestReviewCommentEvent, PullRequestReviewEvent)
  - [x] Issue Comments (via Events API - IssueCommentEvent)
  - [x] Commit Comments (via Events API - CommitCommentEvent)
  - [ ] Discussions (GraphQL API) - Skipped for MVP, can be added later
  - [ ] Discussion Comments (GraphQL API) - Skipped for MVP
- [x] **3.4** Create "Refresh Activity" action per student/class
  - `fetchForStudent` action for individual student
  - `fetchForClass` action for all students in a class
- [x] **3.5** Store fetched activities in Convex for caching
  - Deduplication via `githubId` index
  - Stores full raw data for future use
- [x] **3.6** Display rate limit status in UI
  - Created `RateLimitStatus` component
  - Added to Dashboard

### Phase 4: Activity Display & Summaries ✅
**Goal**: Show activity summaries and timelines for students.

- [x] **4.1** Create Student Activity Summary component
  - Total counts by activity type
  - Activity breakdown chart/visualization (clickable cards)
  - ~~Date range filtering~~ (deferred to Phase 5)
  - Created in `src/pages/StudentActivity.tsx`
- [x] **4.2** Create Activity Timeline component
  - Chronological list of all activities
  - Filter by activity type
  - Expandable details for each activity
  - Created in `src/pages/StudentActivity.tsx`
- [x] **4.3** Create Class Overview dashboard
  - Summary of all students' activity (activity counts in ClassDetail)
  - Quick stats via `getCountsByClass` query
  - "Refresh All" button for batch fetching
- [ ] **4.4** Add date range filtering across the app (deferred)
- [x] **4.5** Polish UI/UX and responsive design (basic implementation complete)

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
| Phase 1: GitHub OAuth | ✅ Complete | ✓ | ✓ |
| Phase 2: Class & Student Management | ✅ Complete | ✓ | ✓ |
| Phase 3: GitHub Activity Fetching | ✅ Complete | ✓ | ✓ |
| Phase 4: Activity Display & Summaries | ✅ Complete | ✓ | ✓ |
| Phase 5: Polish & Deployment | ⬜ Not Started | - | - |

---

## Recent Changes

### Phase 4 Implementation (Complete)
- Most of Phase 4 was implemented alongside Phase 3
- Student Activity page (`/students/:studentId`) includes:
  - Activity summary with counts by type
  - Activity timeline with filtering and expandable details
- Class Detail page now shows activity counts per student
- Deferred date range filtering to Phase 5 polish

### Phase 3 Implementation (Complete)
- Created `convex/activities.ts` with:
  - `listByStudent` - Query activities for a student with optional type filter
  - `getCountsByStudent` - Get activity counts by type for a student
  - `getCountsByClass` - Get activity counts for all students in a class
  - `getLastFetchTime` - Get when activity was last fetched for a student
  - `fetchForStudent` - Action to fetch all GitHub activity for a student
  - `fetchForClass` - Action to fetch activity for all students in a class
  - `checkRateLimit` - Action to check GitHub API rate limit status
  - Internal helpers for rate-limited, paginated GitHub API requests
- Created `src/pages/StudentActivity.tsx`:
  - Activity summary cards showing counts by type
  - Activity timeline with expandable details
  - Type filtering
  - Manual refresh button
- Created `src/components/RateLimitStatus.tsx`:
  - Visual progress bar showing remaining API calls
  - Reset time countdown
  - Low rate limit warning
- Updated `src/pages/ClassDetail.tsx`:
  - Added "Refresh All" button to fetch activity for all students
  - Added activity counts next to student names
  - Added "View Activity" links to student rows
- Updated `src/pages/Dashboard.tsx`:
  - Added RateLimitStatus component
  - Added activity tracking info section
- Added `/students/:studentId` route to `App.tsx`

### Phase 2 Implementation (Complete)
- Added navigation header with links to Dashboard, Organizations, and Classes
- Created Organizations page to add GitHub orgs and sync members
- Created Classes page to create and manage classes
- Created ClassDetail page to assign students to classes
- Updated Dashboard with stats overview and getting started guide
- All backend functions for organizations, classes, and students are complete
- Tested and verified working end-to-end

---

## Notes & Decisions

- **OAuth vs GitHub App**: Chose OAuth for simplicity. GitHub App would be needed if we wanted webhooks for real-time updates, but MVP uses manual refresh.
- **Data Storage**: Caching in Convex to reduce API calls and provide faster load times.
- **Student Import**: Using GitHub API to fetch organization members instead of CSV import. Teacher provides org URL, we fetch members and let them organize into classes.
- **Multi-class Students**: Students can belong to multiple classes (e.g., same student in different semesters).
- **Multi-tenancy**: Schema supports multiple teachers, but auth currently assumes single user.
