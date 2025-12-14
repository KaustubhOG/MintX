use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::{
        transfer_checked,
        TransferChecked,
        Token2022,
    },
};

use crate::state::{VestingConfig, UserVesting};
use crate::utils::time;

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: Validated by token program and constraints
    pub mint: UncheckedAccount<'info>,

    #[account(
        has_one = mint,
        seeds = [b"vesting_config", mint.key().as_ref()],
        bump = vesting_config.bump
    )]
    pub vesting_config: Account<'info, VestingConfig>,

    /// CHECK: Validated by token program constraints
    #[account(mut)]
    pub vault_ata: UncheckedAccount<'info>,

    /// CHECK: Validated by token program constraints
    #[account(mut)]
    pub user_ata: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"user_vesting", vesting_config.key().as_ref(), user.key().as_ref()],
        bump = user_vesting.bump
    )]
    pub user_vesting: Account<'info, UserVesting>,

    pub system_program: Program<'info, System>,
    pub token_2022_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(ctx: Context<Claim>) -> Result<()> {
    let mint = &ctx.accounts.mint;
    let vesting_config = &ctx.accounts.vesting_config;
    let vault_ata = &ctx.accounts.vault_ata;
    let user_ata = &ctx.accounts.user_ata;
    let user_vesting = &mut ctx.accounts.user_vesting;

    let now = time::now_ts()?;

    let total = user_vesting.total_allocation;

    let vested: u64 = if now < vesting_config.cliff_time {
        0
    } else if now >= vesting_config.end_time {
        total
    } else {
        let elapsed = (now - vesting_config.start_time).max(0) as u64;
        let duration = (vesting_config.end_time - vesting_config.start_time).max(1) as u64;
        total
            .saturating_mul(elapsed)
            .saturating_div(duration)
    };

    let already_claimed = user_vesting.claimed_amount;
    if vested <= already_claimed {
        return Ok(()); 
    }

    let claimable = vested - already_claimed;
    if claimable == 0 {
        return Ok(());
    }

    // Get mint decimals from account data
    let mint_data = mint.try_borrow_data()?;
    require!(mint_data.len() >= 45, crate::error::ErrorCode::Placeholder);
    let decimals = mint_data[44];

    // Transfer claimable tokens from vault → user (PDA signer)
    let mint_key = mint.key();
    let signer_seeds: &[&[u8]] = &[
        b"vesting_config",
        mint_key.as_ref(),
        &[vesting_config.bump],
    ];

    transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_2022_program.to_account_info(),
            TransferChecked {
                from: vault_ata.to_account_info(),
                to: user_ata.to_account_info(),
                authority: vesting_config.to_account_info(),
                mint: mint.to_account_info(),
            },
            &[signer_seeds],
        ),
        claimable,
        decimals,
    )?;

    // Update claimed amount
    user_vesting.claimed_amount = user_vesting
        .claimed_amount
        .saturating_add(claimable);

    Ok(())
}