use anchor_lang::prelude::*;

declare_id!("EaStspxH2eetARb5xBZkwmYM2HhQPRc5vPAKEVc1Uidt");

#[program]
pub mod solareign {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn mint_hero(ctx: Context<MintHero>, name: String, path: u8) -> Result<()> {
        let hero = &mut ctx.accounts.hero;
        let user = &ctx.accounts.user;
        let clock = Clock::get()?;
        
        hero.owner = *user.key;
        hero.name = name;
        hero.path = path; // 0 = Light, 1 = Dark
        hero.level = 1;
        hero.xp = 0;
        hero.unallocated_points = 0;
        hero.aurum_balance = 0;
        
        // Pseudo-random distribution of 45 points across 5 stats (base 1 for each)
        // Total stats sum will always be 50.
        let mut stats = [1, 1, 1, 1, 1];
        let mut remaining = 45;
        
        // Simple pseudo-random using timestamp and user key mixed
        let mut seed_val = clock.unix_timestamp as u64 ^ user.key.to_bytes()[0] as u64;
        
        while remaining > 0 {
            // Linear congruential generator for basic randomness
            seed_val = seed_val.wrapping_mul(6364136223846793005).wrapping_add(1);
            let idx = (seed_val % 5) as usize;
            stats[idx] += 1;
            remaining -= 1;
        }

        hero.strength = stats[0] as u16;
        hero.skill = stats[1] as u16;
        hero.agility = stats[2] as u16;
        hero.constitution = stats[3] as u16;
        hero.luck = stats[4] as u16;

        Ok(())
    }

    pub fn pve_mission(ctx: Context<PvEMission>, mission_type: u8) -> Result<()> {
        let hero = &mut ctx.accounts.hero;
        
        // Simple mock of PvE outcome
        // mission_type 1 (easy) -> +10 XP, +5 Aurum
        // mission_type 2 (hard) -> +30 XP, +15 Aurum
        let xp_gain = match mission_type {
            1 => 10,
            2 => 30,
            _ => 10,
        };
        let aurum_gain = match mission_type {
            1 => 5,
            2 => 15,
            _ => 5,
        };
        
        hero.xp += xp_gain;
        hero.aurum_balance += aurum_gain;

        // Check level up (100 XP * level required)
        if hero.xp >= (hero.level as u64 * 100) {
            hero.xp -= hero.level as u64 * 100;
            hero.level += 1;
            hero.unallocated_points += 3; // 3 attribute points gained per level
        }

        Ok(())
    }

    pub fn allocate_attributes(
        ctx: Context<AllocateAttributes>, 
        str_points: u16, 
        skill_points: u16, 
        agi_points: u16, 
        con_points: u16, 
        luck_points: u16
    ) -> Result<()> {
        let hero = &mut ctx.accounts.hero;
        let total_requested = str_points + skill_points + agi_points + con_points + luck_points;
        require!(total_requested <= hero.unallocated_points, GameError::NotEnoughPoints);
        
        // Hybrid Attribute System: Cost is 10 Aurum (Silver) per point allocated
        let silver_cost = total_requested as u64 * 10;
        require!(hero.aurum_balance >= silver_cost, GameError::NotEnoughAurum);

        hero.aurum_balance -= silver_cost;
        hero.unallocated_points -= total_requested;

        hero.strength += str_points;
        hero.skill += skill_points;
        hero.agility += agi_points;
        hero.constitution += con_points;
        hero.luck += luck_points;

        Ok(())
    }

    pub fn pvp_battle(ctx: Context<PvPBattle>) -> Result<()> {
        let attacker = &mut ctx.accounts.attacker;
        let defender = &mut ctx.accounts.defender;

        // Betting fee
        let pvp_fee = 50;
        require!(attacker.aurum_balance >= pvp_fee, GameError::NotEnoughAurum);

        // Simple combat calculation based on sum of combat stats
        let attacker_power = attacker.strength + attacker.agility + attacker.skill;
        let defender_power = defender.strength + defender.agility + defender.skill;

        // Pseudo-random dice roll
        let clock = Clock::get()?;
        let seed_val = clock.unix_timestamp as u64 ^ attacker.owner.to_bytes()[0] as u64;
        
        // Attacker and Defender rolls
        let attacker_roll = (seed_val % 20) as u16 + 1 + attacker_power;
        let defender_roll = ((seed_val / 2) % 20) as u16 + 1 + defender_power;

        // Deduct fee upfront
        attacker.aurum_balance -= pvp_fee;

        if attacker_roll > defender_roll {
            // Attacker wins
            let reward = pvp_fee + 30; // Gets fee back + 30 from the arena
            attacker.aurum_balance += reward;
            attacker.xp += 50; 
        } else {
            // Attacker loses, gets minimal XP
            attacker.xp += 10;
        }

        Ok(())
    }
}

#[error_code]
pub enum GameError {
    #[msg("Not enough unallocated points.")]
    NotEnoughPoints,
    #[msg("Not enough Aurum (Silver) to upgrade.")]
    NotEnoughAurum,
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
#[instruction(name: String, path: u8)]
pub struct MintHero<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + Hero::INIT_SPACE,
        seeds = [b"hero", user.key().as_ref()],
        bump
    )]
    pub hero: Account<'info, Hero>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PvEMission<'info> {
    #[account(
        mut,
        seeds = [b"hero", user.key().as_ref()],
        bump,
        has_one = owner,
    )]
    pub hero: Account<'info, Hero>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct AllocateAttributes<'info> {
    #[account(
        mut,
        seeds = [b"hero", user.key().as_ref()],
        bump,
        has_one = owner,
    )]
    pub hero: Account<'info, Hero>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct PvPBattle<'info> {
    #[account(
        mut,
        seeds = [b"hero", user.key().as_ref()],
        bump,
        has_one = owner,
    )]
    pub attacker: Account<'info, Hero>,
    #[account(mut)] // Can be any other hero
    pub defender: Account<'info, Hero>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Hero {
    pub owner: Pubkey,
    #[max_len(32)]
    pub name: String,
    pub path: u8, // 0 = Light, 1 = Dark
    pub level: u32,
    pub xp: u64,
    pub aurum_balance: u64,
    pub unallocated_points: u16,
    pub strength: u16,
    pub skill: u16,
    pub agility: u16,
    pub constitution: u16,
    pub luck: u16,
}
