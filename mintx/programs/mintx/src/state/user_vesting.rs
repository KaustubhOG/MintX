use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct UserVesting {
    pub total_allocation: u64,
    pub claimed_amount: u64,
    pub bump: u8,
}
