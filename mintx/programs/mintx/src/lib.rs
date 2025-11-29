use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;

declare_id!("Uc4fovAcAtr9S3YGpNqe9ihJSUDQSTVThn1mdBcgDrX");

#[program]
pub mod mintx {
    use super::*;

    pub fn create_token(
        ctx: Context<CreateToken>,
        decimals: u8,
        initial_supply: u64,
    ) -> Result<()> {
        instructions::create_token::handler(ctx, decimals, initial_supply)
    }
}