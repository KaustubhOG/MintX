use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;
pub mod utils;

declare_id!("Uc4fovAcAtr9S3YGpNqe9ihJSUDQSTVThn1mdBcgDrX");

#[program]
pub mod mintx {
    use super::*;

pub fn create_token(
    ctx: Context<instructions::create_token::CreateToken>,
    decimal: u8,
    initial_supply: u64,
) -> Result<()> {
    instructions::create_token::handler(ctx, decimal, initial_supply)
}

}
