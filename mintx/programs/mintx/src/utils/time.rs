use anchor_lang::prelude::*;

/// Returns current unix timestamp (seconds)
pub fn now_ts() -> Result<i64> {
    Ok(Clock::get()?.unix_timestamp)
}
    