FROM rust:slim-bookworm

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    pkg-config \
    build-essential \
    libudev-dev \
    libssl-dev \
    git \
    python3 \
    bzip2 \
    && rm -rf /var/lib/apt/lists/*

# Install Solana CLI (Binary) via Agave v2.1.0
RUN curl -L https://github.com/anza-xyz/agave/releases/download/v2.1.0/solana-release-x86_64-unknown-linux-gnu.tar.bz2 -o solana.tar.bz2 && \
    tar jxf solana.tar.bz2 && \
    mkdir -p /root/.local/share/solana/install/active_release && \
    mv solana-release/* /root/.local/share/solana/install/active_release/ && \
    rm -rf solana.tar.bz2 solana-release
ENV PATH="/root/.local/share/solana/install/active_release/bin:${PATH}"

# Install Node.js, NPM & Yarn
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g yarn

# Install Anchor CLI via NPM (Pre-built binary)
RUN npm install -g @coral-xyz/anchor-cli@0.29.0

WORKDIR /app

# Ensure solana and anchor are available
RUN ln -sf /root/.local/share/solana/install/active_release/bin/solana /usr/local/bin/solana && \
    ln -sf /root/.local/share/solana/install/active_release/bin/solana-keygen /usr/local/bin/solana-keygen && \
    ln -sf /root/.local/share/solana/install/active_release/bin/cargo-build-sbf /usr/local/bin/cargo-build-sbf && \
    echo '#!/bin/bash\nshift\nexec cargo-build-sbf "$@"' > /usr/local/bin/cargo-build-bpf && chmod +x /usr/local/bin/cargo-build-bpf && \
    ln -sf /root/.local/share/solana/install/active_release/bin/cargo-test-sbf /usr/local/bin/cargo-test-sbf

# Expose ports
EXPOSE 3000 8899 8900
