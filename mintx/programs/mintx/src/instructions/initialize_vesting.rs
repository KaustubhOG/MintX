use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::{
        transfer_checked,
        TransferChecked,
        Token2022,
    },
};

use crate::state::VestingConfig;

#[derive(Accounts)]
pub struct InitializeVesting<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: Validated by token program during transfer
    pub mint: UncheckedAccount<'info>,

    #[account(
        init,
        payer = user,
        space = 8 + VestingConfig::INIT_SPACE,
        seeds = [b"vesting_config", mint.key().as_ref()],
        bump
    )]
    pub vesting_config: Account<'info, VestingConfig>,

    /// CHECK: Initialized and validated by associated token program
    #[account(mut)]
    pub vault_ata: UncheckedAccount<'info>,

    /// CHECK: Validated by token program during transfer
    #[account(mut)]
    pub user_ata: UncheckedAccount<'info>,

    /// Programs
    pub system_program: Program<'info, System>,
    pub token_2022_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(
    ctx: Context<InitializeVesting>,
    start_time: i64,
    cliff_time: i64,
    end_time: i64,
    total_amount: u64,
) -> Result<()> {
    let user = &ctx.accounts.user;
    let vesting_config = &mut ctx.accounts.vesting_config;
    let mint = &ctx.accounts.mint;
    let user_ata = &ctx.accounts.user_ata;
    let vault_ata = &ctx.accounts.vault_ata;

    // Get mint decimals from account data
    let mint_data = mint.try_borrow_data()?;
    require!(mint_data.len() >= 45, crate::error::ErrorCode::Placeholder);
    let decimals = mint_data[44];

    // 1) Save global vesting config
    vesting_config.authority = user.key();
    vesting_config.mint = mint.key();
    vesting_config.start_time = start_time;
    vesting_config.cliff_time = cliff_time;
    vesting_config.end_time = end_time;
    vesting_config.total_amount = total_amount;
    vesting_config.bump = ctx.bumps.vesting_config;

    // 2) Move tokens from user → vault (lock them)
    transfer_checked(
        CpiContext::new(
            ctx.accounts.token_2022_program.to_account_info(),
            TransferChecked {
                from: user_ata.to_account_info(),
                to: vault_ata.to_account_info(),
                authority: user.to_account_info(),
                mint: mint.to_account_info(),
            },
        ),
        total_amount,
        decimals,
    )?;

    Ok(())
}