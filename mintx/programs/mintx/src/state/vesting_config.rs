use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct VestingConfig {
    pub mint: Pubkey,
    pub authority: Pubkey,
    pub start_time: i64,
    pub cliff_time: i64,
    pub end_time: i64,
    pub total_amount: u64,
    pub bump: u8,
}
