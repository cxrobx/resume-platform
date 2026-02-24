---
description: Commit and deploy to NAS
argument-hint: [commit message]
---

Deploy the resume-platform project to the NAS.

Working directory: /Users/christopherrobinson/Projects/resume-platform

Steps:
1. Run `git status` to show what has changed.
2. Run `git diff --stat HEAD` to summarize the changes.
3. Stage all changes with `git add -A`.
4. Commit using the message from $ARGUMENTS if provided, otherwise write a concise commit message that reflects the actual changes (e.g. "update work experience", "fix bullet spacing", "add API endpoint").
5. Push to the NAS remote: `git push nas main`
6. Show the remote output from the post-receive hook so the user can see whether a container rebuild was triggered or if it was a fast content-only deploy.

After pushing, report:
- Which files changed
- Whether the NAS did a container rebuild or a fast content-only deploy (you can tell from the hook output: "Content-only changes" vs "rebuilding containers")
- The live URLs: http://192.168.4.22:18851/editor (NAS) and http://localhost:3030/editor (local)
