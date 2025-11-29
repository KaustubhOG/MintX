use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token_2022::{
        initialize_mint2, mint_to, InitializeMint2, MintTo, Token2022,
    },
};

#[derive(Accounts)]
pub struct CreateToken<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub mint: UncheckedAccount<'info>,

    #[account(mut)]
    pub user_ata: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_2022_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(
    ctx: Context<CreateToken>,
    decimals: u8,
    initial_supply: u64,
) -> Result<()> {
    let user = &ctx.accounts.user;
    let mint = &ctx.accounts.mint;
    let user_ata = &ctx.accounts.user_ata;


    initialize_mint2(
        CpiContext::new(
            ctx.accounts.token_2022_program.to_account_info(),
            InitializeMint2 {
                mint: mint.to_account_info(),
            },
        ),
        decimals,
        &user.key(),       // mint authority
        Some(&user.key()), // freeze authority
    )?;


    associated_token::create(CpiContext::new(
        ctx.accounts.associated_token_program.to_account_info(),
        associated_token::Create {
            payer: user.to_account_info(),
            associated_token: user_ata.to_account_info(),
            authority: user.to_account_info(),
            mint: mint.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            token_program: ctx.accounts.token_2022_program.to_account_info(),
        },
    ))?;


    let amount = initial_supply * 10u64.pow(decimals as u32);
    mint_to(
        CpiContext::new(
            ctx.accounts.token_2022_program.to_account_info(),
            MintTo {
                mint: mint.to_account_info(),
                to: user_ata.to_account_info(),
                authority: user.to_account_info(),
            },
        ),
        amount,
    )?;

    Ok(())
}