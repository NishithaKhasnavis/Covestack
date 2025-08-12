# CoveStack MVP Scope

## Problem Statement
A problem I face as a software developer working on projects in teams is switching between different tools - GitHub, Slack, Notion, VSCode, or shared docs. The fragmentation often breaks my workflow and reduces my productivity. This is a problem thats not just constrained to me but affects many developers in their daily life.

To address this, I am working on a personal project - CoveStack: a cloud-native collaboration platform designed to bring code sharing, task management, and real-time communication into a single, unified workspace. The goal is to eliminate the friction caused by context switching and give developers a streamlined environment where they can focus on building, collaborating, and iterating - without jumping across disconnected tools. 


## Target Users
Micro-teams (up to 5 people) working on projects:
- Students in project-based CS, design, or startup classes  
- Hackathon teams  
- Online study groups (LLM clubs, LeetCode pods)  
- Early-stage startup or research teams  



## Product Vision
CoveStack is a cloud-native collaboration platform designed for teams to bring code sharing, task management, and real-time communication into a single, unified workspace

## MVP Features (Must-Have)
- Task board (Kanban-style)
- Markdown-based shared notes
- Real-time chat (via Socket.io)
- Workspace templates (e.g. “LeetCode Tracker”)
- Progress check-in logs + reminder pings
- User Authentication (OAuth2 + JWT)
- Workspace creation and membership


## Nice-to-Have Features (Future)
- Plugin system (e.g. GitHub repo, YouTube timestamps)
- Stripe monetization (tip jars, premium tiers)
- Daily digest email summaries
- Slack/Discord integration
- Mobile-friendly design / PWA support



## 🔧 Tech Stack 
Frontend:
- React, TypeScript, TailwindCSS, Zustand, ShadCN UI

Backend:
- FastAPI (Python) for REST APIs, Fastify (Node.js) + Socket.io for realtime

Database:
- PostgreSQL (via Prisma ORM) 

Realtime:
- Redis for pub-sub & session cache  

DevOps:
- Docker, GitHub Actions, AWS EC2 + S3 + RDS

Authentication:
- OAuth2 + JWT + Role-Based Access

Monetization:
- Stripe API + Webhooks 

