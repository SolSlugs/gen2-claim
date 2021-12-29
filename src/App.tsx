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
    process.env.REACT_APP_TREASURY_ADDRESS!
);

const config = new PublicKey(
    process.env.REACT_APP_CANDY_MACHINE_CONFIG!
);

const candyMachineId = new PublicKey(
    process.env.REACT_APP_CANDY_MACHINE_ID!
);

const tokenMintPublicKey = new PublicKey(
    process.env.REACT_APP_PAYMENT_TOKEN_MINT!
);

const network = process.env.REACT_APP_SOLANA_NETWORK as WalletAdapterNetwork;

const rpcHost = process.env.REACT_APP_SOLANA_RPC_HOST!;
const connection = new anchor.web3.Connection(rpcHost);

const startDateSeed = parseInt(process.env.REACT_APP_CANDY_START_DATE!, 10);

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
