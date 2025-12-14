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

    pub fn initialize_vesting(
        ctx: Context<InitializeVesting>,
        start_time: i64,
        cliff_time: i64,
        end_time: i64,
        total_amount: u64,
    ) -> Result<()> {
        instructions::initialize_vesting::handler(
            ctx,
            start_time,
            cliff_time,
            end_time,
            total_amount,
        )
    }

    pub fn initialize_user_vesting(
        ctx: Context<InitializeUserVesting>,
        total_allocation: u64,
    ) -> Result<()> {
        instructions::initialize_user_vesting::handler(ctx, total_allocation)
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        instructions::claim::handler(ctx)
    }
}
