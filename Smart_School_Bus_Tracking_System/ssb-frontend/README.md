# Smart school bus dashboard

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/nhuutri1311-5135s-projects/v0-ssb)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/Ks0EOuyTCVP)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/nhuutri1311-5135s-projects/v0-ssb](https://vercel.com/nhuutri1311-5135s-projects/v0-ssb)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/projects/Ks0EOuyTCVP](https://v0.app/chat/projects/Ks0EOuyTCVP)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## Auth Guards

- The app provides client-side guards in `lib/guards`:
	- `RequireAuth` redirects unauthenticated users to `/login`.
	- `RequireRole` enforces role-based access and redirects users to their own dashboard (e.g. `/admin`, `/driver`, `/parent`).
			- `RequireRole` enforces role-based access and redirects users to their own dashboard (e.g. `/admin`, `/driver`, `/parent`).
- Route sections are protected via App Router layouts:
	- `app/admin/layout.tsx` → only `admin`
	- `app/driver/layout.tsx` → only `driver`
	- `app/parent/layout.tsx` → only `parent`

To protect a new section, add a `layout.tsx` under that route and wrap `{children}` with `RequireRole`.

