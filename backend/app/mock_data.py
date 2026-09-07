"""
SIH 2026 PS-183 Demo Mock Data
Simulates a realistic investment-scam fund-flow topology:

  Victim1 ──10 ETH──►  Target (0xDEMO_SIH_183)
  Victim2 ──15 ETH──►  Target
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
      Tornado Cash (Mixer)    Binance Hot Wallet (Exchange)
          10 ETH                  15 ETH
              │
              ▼
      Burner2 (Layer wallet)
          9.8 ETH
"""

import time

now = int(time.time())
day = 86400

MOCK_THREAT_INTEL = [
    {"address": "0x12D66f87A04A9E220743712cE6d9bB1B5616B8Fc", "category": "sanctions", "source": "OFAC"},
    {"address": "0x12D66f87A04A9E220743712cE6d9bB1B5616B8Fc", "category": "mixer", "source": "TraceX Intelligence"},
]

# ── Addresses ────────────────────────────────────────────────────────────────
ADDR_TARGET   = "0xDEMO_SIH_183"
ADDR_VICTIM1  = "0xAaaa111111111111111111111111111111111111"
ADDR_VICTIM2  = "0xBbbb222222222222222222222222222222222222"
ADDR_MIXER    = "0x12D66f87A04A9E220743712cE6d9bB1B5616B8Fc"   # Tornado Cash
ADDR_EXCHANGE = "0x28C6c06298d514Db089934071355E5743bf21d60"   # Binance
ADDR_BURNER   = "0xDead333344445555666677778888999900001111"   # Burner / Layer wallet

# ── Wallet summary ────────────────────────────────────────────────────────────
MOCK_WALLET = {
    "address": ADDR_TARGET,
    "chain": "ethereum",
    "native_currency": "ETH",
    "native_balance": "2.3",
    "native_balance_raw": "2300000000000000000",
    "total_received": "25.2",
    "total_sent": "22.9",
    "transaction_count": 6,
}

# ── VASP intelligence ─────────────────────────────────────────────────────────
MOCK_VASP_SUMMARY = {
    "status": "ok",
    "target": {
        "verdict": {
            "state": "unidentified",
            "identified": False,
            "consensus": None,
        }
    },
    "vasp_entities": [
        {
            "address": ADDR_MIXER,
            "name": "Tornado Cash",
            "type": "Mixer",
            "vasp_type": "mixer",
            "risk_score": 100,
            "description": "Known cryptocurrency mixer / tumbler. Sanctioned by OFAC.",
            "sanctioned": True,
        },
        {
            "address": ADDR_EXCHANGE,
            "name": "Binance",
            "type": "Exchange",
            "vasp_type": "exchange",
            "risk_score": 20,
            "description": "Binance Hot Wallet #14 — major VASP, KYC required.",
            "sanctioned": False,
        },
        {
            "address": ADDR_BURNER,
            "name": "Unknown Burner Wallet",
            "type": "Suspect",
            "vasp_type": "suspect",
            "risk_score": 85,
            "description": "Non-custodial wallet with rapid in-out activity consistent with layering.",
            "sanctioned": False,
        },
        {
            "address": "TRON_BRIDGE_ADDR",
            "name": "TronBridge",
            "type": "Bridge",
            "vasp_type": "bridge",
            "risk_score": 50,
            "description": "Cross-chain bridge protocol",
            "sanctioned": False,
        },
    ],
    "counterparty_risks": {
        ADDR_MIXER.lower():    100,
        ADDR_EXCHANGE.lower(): 20,
        ADDR_BURNER.lower():   85,
        ADDR_VICTIM1.lower():  5,
        ADDR_VICTIM2.lower():  5,
    },
    "identified_count": 2,
    "state_counts": {"identified": 2, "unidentified": 1},
    "address_labels": {
        ADDR_MIXER.lower():    "Tornado Cash",
        ADDR_EXCHANGE.lower(): "Binance",
        ADDR_BURNER.lower():   "Burner Wallet",
    },
}

# ── Transaction events ────────────────────────────────────────────────────────
# Each event must have:
#   tx_hash, event_id, from_address, to_address,
#   counterparty_addresses (required by _counterparties_from_events)
MOCK_EVENTS = [
    # 1. Victim 1 → Target
    {
        "event_id":    "0xevent0001_v1_to_target",
        "tx_hash":     "0xabc0000000000000000000000000000000000000000000000000000000000001",
        "block_number": 19000001,
        "timestamp":   now - (4 * day),
        "from_address": ADDR_VICTIM1,
        "to_address":  ADDR_TARGET,
        "from_addresses": [ADDR_VICTIM1],
        "to_addresses": [ADDR_TARGET],
        "counterparty_addresses": [ADDR_VICTIM1],
        "direction":   "inbound",
        "transaction_type": "native",
        "asset":       "ETH",
        "amount":      "10.0",
        "amount_raw":  "10000000000000000000",
        "status":      "success",
        "provider":    "etherscan",
        "hop_level":   0,
    },
    # 2. Victim 2 → Target
    {
        "event_id":    "0xevent0002_v2_to_target",
        "tx_hash":     "0xabc0000000000000000000000000000000000000000000000000000000000002",
        "block_number": 19000050,
        "timestamp":   now - (3 * day),
        "from_address": ADDR_VICTIM2,
        "to_address":  ADDR_TARGET,
        "from_addresses": [ADDR_VICTIM2],
        "to_addresses": [ADDR_TARGET],
        "counterparty_addresses": [ADDR_VICTIM2],
        "direction":   "inbound",
        "transaction_type": "native",
        "asset":       "ETH",
        "amount":      "15.2",
        "amount_raw":  "15200000000000000000",
        "status":      "success",
        "provider":    "etherscan",
        "hop_level":   0,
    },
    # 3. Target → Tornado Cash (Mixer / layering)
    {
        "event_id":    "0xevent0003_target_to_mixer",
        "tx_hash":     "0xabc0000000000000000000000000000000000000000000000000000000000003",
        "block_number": 19000100,
        "timestamp":   now - (2 * day),
        "from_address": ADDR_TARGET,
        "to_address":  ADDR_MIXER,
        "from_addresses": [ADDR_TARGET],
        "to_addresses": [ADDR_MIXER],
        "counterparty_addresses": [ADDR_MIXER],
        "direction":   "outbound",
        "transaction_type": "native",
        "asset":       "ETH",
        "amount":      "10.0",
        "amount_raw":  "10000000000000000000",
        "status":      "success",
        "provider":    "etherscan",
        "hop_level":   1,
    },
    # 4. Target → Binance (Exchange off-ramp)
    {
        "event_id":    "0xevent0004_target_to_exchange",
        "tx_hash":     "0xabc0000000000000000000000000000000000000000000000000000000000004",
        "block_number": 19000200,
        "timestamp":   now - (1 * day),
        "from_address": ADDR_TARGET,
        "to_address":  ADDR_EXCHANGE,
        "from_addresses": [ADDR_TARGET],
        "to_addresses": [ADDR_EXCHANGE],
        "counterparty_addresses": [ADDR_EXCHANGE],
        "direction":   "outbound",
        "transaction_type": "native",
        "asset":       "ETH",
        "amount":      "10.0",
        "amount_raw":  "10000000000000000000",
        "status":      "success",
        "provider":    "etherscan",
        "hop_level":   1,
    },
    # 5. Mixer → Burner (second layer)
    {
        "event_id":    "0xevent0005_mixer_to_burner",
        "tx_hash":     "0xabc0000000000000000000000000000000000000000000000000000000000005",
        "block_number": 19000300,
        "timestamp":   now - 43200,
        "from_address": ADDR_MIXER,
        "to_address":  ADDR_BURNER,
        "from_addresses": [ADDR_MIXER],
        "to_addresses": [ADDR_BURNER],
        "counterparty_addresses": [ADDR_BURNER, ADDR_MIXER],
        "direction":   "outbound",
        "transaction_type": "native",
        "asset":       "ETH",
        "amount":      "9.8",
        "amount_raw":  "9800000000000000000",
        "status":      "success",
        "provider":    "etherscan",
        "hop_level":   2,
    },
    # 6. Burner → Exchange (final off-ramp)
    {
        "event_id":    "0xevent0006_burner_to_exchange",
        "tx_hash":     "0xabc0000000000000000000000000000000000000000000000000000000000006",
        "block_number": 19000400,
        "timestamp":   now - 3600,
        "from_address": ADDR_BURNER,
        "to_address":  ADDR_EXCHANGE,
        "from_addresses": [ADDR_BURNER],
        "to_addresses": [ADDR_EXCHANGE],
        "counterparty_addresses": [ADDR_EXCHANGE, ADDR_BURNER],
        "direction":   "outbound",
        "transaction_type": "native",
        "asset":       "ETH",
        "amount":      "9.5",
        "amount_raw":  "9500000000000000000",
        "status":      "success",
        "provider":    "etherscan",
        "hop_level":   2,
    },
    # 7. Cross-chain TRON transaction
    {
        "event_id":    "0xevent0007_burner_to_tron",
        "tx_hash":     "0xabc0000000000000000000000000000000000000000000000000000000000007",
        "block_number": 19000500,
        "timestamp":   now - 1800,
        "from_address": ADDR_BURNER,
        "to_address":  "TRON_BRIDGE_ADDR",
        "from_addresses": [ADDR_BURNER],
        "to_addresses": ["TRON_BRIDGE_ADDR"],
        "counterparty_addresses": ["TRON_BRIDGE_ADDR"],
        "direction":   "outbound",
        "transaction_type": "native",
        "asset":       "ETH",
        "amount":      "9.0",
        "amount_raw":  "9000000000000000000",
        "status":      "success",
        "provider":    "etherscan",
        "hop_level":   3,
        "cross_chain_bridge": True
    },
    {
        "event_id":    "0xevent0008_tron_receiver",
        "tx_hash":     "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        "block_number": 55000000,
        "timestamp":   now - 1700,
        "from_address": "TRON_BRIDGE_ADDR",
        "to_address":  "TRX_FINAL_ADDR",
        "from_addresses": ["TRON_BRIDGE_ADDR"],
        "to_addresses": ["TRX_FINAL_ADDR"],
        "counterparty_addresses": ["TRX_FINAL_ADDR"],
        "direction":   "outbound",
        "transaction_type": "native",
        "asset":       "TRX",
        "amount":      "9000.0",
        "amount_raw":  "9000000000",
        "status":      "success",
        "provider":    "trongrid",
        "hop_level":   4,
    }
]
