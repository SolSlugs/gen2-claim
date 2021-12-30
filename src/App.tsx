import { useMemo } from "react";

import Home from "./Home";

import * as anchor from "@project-serum/anchor";
import { clusterApiUrl } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
    getPhantomWallet,
    getSlopeWallet,
    getSolflareWallet,
    getSolletWallet,
    getSolletExtensionWallet,
} from "@solana/wallet-adapter-wallets";
import { PublicKey } from '@solana/web3.js';

import {
    ConnectionProvider,
    WalletProvider,
} from "@solana/wallet-adapter-react";

import { WalletDialogProvider } from "@solana/wallet-adapter-material-ui";
import { createTheme, ThemeProvider } from "@material-ui/core";

const treasury = new PublicKey(
    'BnyR8w8JaHugASzoiwsydhdDKS6VZyujxQcTgryPGhis',
);

const config = new PublicKey(
    '7WTEyfMay4mb2Drr1csrkxGFpanXjCzHf64obfPcDRWQ'
);

const candyMachineId = new PublicKey(
    '6ebgTh2HpFH3WvUxjSPRcUE6siRvD9Fx7zUwAnDKjUBs'
);

const tokenMintPublicKey = new PublicKey(
    'gen2VK2sZstCfzsbN7rGiMCoe4WuMS9JwLiJNTn4cEy'
);

const network = 'mainnet-beta' as WalletAdapterNetwork;

const rpcHost = 'https://spring-crimson-shape.solana-mainnet.quiknode.pro/101d753db4b4b167756067e5dbeabb4fad28adb3/';
const connection = new anchor.web3.Connection(rpcHost);
const startDateSeed = 1577836800;

const theme = createTheme({
    palette: {
        type: "dark",
    },
    overrides: {
        MuiButtonBase: {
            root: {
                justifyContent: "centered",
            },
        },
        MuiButton: {
            root: {
                textTransform: undefined,
                padding: "12px 16px",
            },
            startIcon: {
                marginRight: 8,
            },
            endIcon: {
                marginLeft: 8,
            },
        },
    },
});

const App = () => {
    const endpoint = useMemo(() => clusterApiUrl(network), []);

    const wallets = useMemo(
        () => [
            getPhantomWallet(),
            getSlopeWallet(),
            getSolflareWallet(),
            getSolletWallet({ network }),
            getSolletExtensionWallet({ network }),
        ],
        []
    );

    return (
        <ThemeProvider theme={theme}>
            <ConnectionProvider endpoint={endpoint}>
                <WalletProvider wallets={wallets} autoConnect={true}>
                    <WalletDialogProvider>
                        <div className="Aligner">
                            <div className="Aligner-item Aligner-item--top"></div>
                            <div className="Aligner-item">
                                <Home
                                    candyMachineId={candyMachineId}
                                    config={config}
                                    connection={connection}
                                    startDate={startDateSeed}
                                    treasury={treasury}
                                    tokenMintPublicKey={tokenMintPublicKey}
                                />
                            </div>
                            <div className="Aligner-item Aligner-item--bottom"></div>
                        </div>
                    </WalletDialogProvider>
                </WalletProvider>
            </ConnectionProvider>
        </ThemeProvider>
    );
};

export default App;
