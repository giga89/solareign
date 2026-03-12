# Solareign ⚔️

**Solareign** is a tactical RPG built on the Solana blockchain. Experience strategic combat, manage your hero's energy, and climb the ranks in an ecosystem designed for long-term sustainability.

## Features
- **Tactical Combat**: Pre-configure your 5-round battle patterns (Attack & Defense) to outsmart enemies.
- **8 Unique Archetypes**: Choose your path (Light/Dark) and class (Paladin, Seraph, Valkyrie, Aegis, Shade, Necrolord, Abyss Lord, Dreadweaver).
- **Dynamic Progression**: Stat upgrade costs scale with power, requiring strategic resource management.
- **Integrated Monitoring**: Centralized logging with Grafana, Loki, and Promtail for real-time performance tracking.
- **Circular Tokenomics**: 90/10 redistribution model with aggressive burn mechanisms to ensure $AURUM stability.

## Quick Start (Docker)
1. Clone the repository: `git clone https://github.com/giga89/solareign.git`
2. Start the stack: `docker compose up -d --build`
3. Access the game: `http://localhost:3004`
4. Access Monitoring (Grafana): `http://localhost:3006` (admin/admin)

## Tech Stack
- **Frontend**: Next.js, Tailwind CSS, Lucide React
- **Blockchain**: Solana, Anchor Framework
- **Monitoring**: Grafana, Loki, Promtail
- **Infrastructure**: Docker & Docker Compose
