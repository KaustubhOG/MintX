use anchor_lang::prelude::*;

use crate::state::{VestingConfig, UserVesting};

#[derive(Accounts)]
pub struct InitializeUserVesting<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: Validated by has_one constraint in vesting_config
    pub mint: UncheckedAccount<'info>,

    #[account(
        has_one = mint,
        seeds = [b"vesting_config", mint.key().as_ref()],
        bump = vesting_config.bump
    )]
    pub vesting_config: Account<'info, VestingConfig>,

    #[account(
        init,
        payer = user,
        space = 8 + UserVesting::INIT_SPACE,
        seeds = [b"user_vesting", vesting_config.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub user_vesting: Account<'info, UserVesting>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeUserVesting>,
    total_allocation: u64,
) -> Result<()> {
    let user_vesting = &mut ctx.accounts.user_vesting;

    user_vesting.total_allocation = total_allocation;
    user_vesting.claimed_amount = 0;
    user_vesting.bump = ctx.bumps.user_vesting;

    Ok(())
}