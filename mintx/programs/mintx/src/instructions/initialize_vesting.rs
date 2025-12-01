use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::{Token2022, Mint, TokenAccount},
};

#[derive(Accounts)]
pub struct InitializeVesting<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// The token mint being vested
    pub mint: Box<Account<'info, Mint>>,

    #[account(
        init,
        payer = user,
        space = 8 + 200,                 // adjust later
        seeds = [b"vesting_config", mint.key().as_ref()],
        bump
    )]
    pub vesting_config: Account<'info, VestingConfig>,

    #[account(
        init,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = vesting_config
    )]
    pub vault_ata: Box<Account<'info, TokenAccount>>,

    /// User's token account where tokens will be transferred from
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = user
    )]
    pub user_ata: Box<Account<'info, TokenAccount>>,

    /// Programs
    pub system_program: Program<'info, System>,
    pub token_2022_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}
