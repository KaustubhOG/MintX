use anchor_lang::prelude::*;

declare_id!("Uc4fovAcAtr9S3YGpNqe9ihJSUDQSTVThn1mdBcgDrX");

#[program]
pub mod mintx {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
