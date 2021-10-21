import { useEffect, useState } from "react";
import styled from "styled-components";
import Countdown from "react-countdown";
import { CircularProgress, Snackbar } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";

import solBros from "./assets/mwahslug.gif";
import logo from "./assets/logo.svg";

import * as anchor from "@project-serum/anchor";

import {
    LAMPORTS_PER_SOL,
    PublicKey,
    Connection,
} from "@solana/web3.js";

import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletDialogButton } from "@solana/wallet-adapter-material-ui";

import {
    CandyMachine,
    getCandyMachineState,
    mintOneToken,
    shortenAddress,
} from "./candy-machine";

const ConnectButton = styled(WalletDialogButton)``;

const CounterText = styled.span``; // add your styles here

export interface HomeProps {
    candyMachineId: PublicKey;
    config: PublicKey;
    connection: Connection;
    startDate: number;
    treasury: PublicKey;
    faucetPublicKey: PublicKey;
    faucetProgramId: PublicKey;
    tokenMintPublicKey: PublicKey;
}

const Home = (props: HomeProps) => {
    const [balance, setBalance] = useState<number>();
    const [isActive, setIsActive] = useState(false); // true when countdown completes
    const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
    const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT

    const [itemsAvailable, setItemsAvailable] = useState(0);
    const [itemsRedeemed, setItemsRedeemed] = useState(0);
    const [itemsRemaining, setItemsRemaining] = useState(0);

    const [alertState, setAlertState] = useState<AlertState>({
        open: false,
        message: "",
        severity: undefined,
    });

    const [startDate, setStartDate] = useState(
        new Date(props.startDate * 1000)
    );

    const wallet = useAnchorWallet();
    const [candyMachine, setCandyMachine] = useState<CandyMachine>();

    const refreshCandyMachineState = () => {
        (async () => {
            if (!wallet) return;

            const {
                candyMachine,
                goLiveDate,
                itemsAvailable,
                itemsRemaining,
                itemsRedeemed,
            } = await getCandyMachineState(
                wallet as anchor.Wallet,
                props.candyMachineId,
                props.connection
            );

            setItemsAvailable(itemsAvailable);
            setItemsRemaining(itemsRemaining);
            setItemsRedeemed(itemsRedeemed);

            setIsSoldOut(itemsRemaining === 0);
            setStartDate(goLiveDate);
            setCandyMachine(candyMachine);
        })();
    };

    const onMint = async () => {
        try {
            setIsMinting(true);
            if (wallet && candyMachine?.program) {
                const status = await mintOneToken(
                    candyMachine,
                    props.config,
                    wallet.publicKey,
                    props.treasury,
                    props.faucetPublicKey,
                    props.faucetProgramId,
                    props.tokenMintPublicKey,
                );

                if (!status?.err) {
                    setAlertState({
                        open: true,
                        message: "Congratulations! Mint succeeded!",
                        severity: "success",
                    });
                } else {
                    setAlertState({
                        open: true,
                        message: "Mint failed! Please try again!",
                        severity: "error",
                    });
                }
            }
        } catch (error: any) {
            // TODO: blech:
            let message = error.msg || "Minting failed! Please try again!";
            if (!error.msg) {
                if (error.message.indexOf("0x138")) {
                } else if (error.message.indexOf("0x137")) {
                    message = `SOLD OUT!`;
                } else if (error.message.indexOf("0x135")) {
                    message = `Insufficient funds to mint. Please fund your wallet.`;
                }
            } else {
                if (error.code === 311) {
                    message = `SOLD OUT!`;
                    setIsSoldOut(true);
                } else if (error.code === 312) {
                    message = `Minting period hasn't started yet.`;
                }
            }

            setAlertState({
                open: true,
                message,
                severity: "error",
            });
        } finally {
            if (wallet) {
                const balance = await props.connection.getBalance(
                    wallet.publicKey
                );
                setBalance(balance / LAMPORTS_PER_SOL);
            }
            setIsMinting(false);
            refreshCandyMachineState();
        }
    };

    useEffect(() => {
        (async () => {
            if (wallet) {
                const balance = await props.connection.getBalance(
                    wallet.publicKey
                );
                setBalance(balance / LAMPORTS_PER_SOL);
            }
        })();
    }, [wallet, props.connection]);

    useEffect(refreshCandyMachineState, [
        wallet,
        props.candyMachineId,
        props.connection,
    ]);

    return (
        <main>
            <div
                className="mint-container"
                style={{ backgroundImage: `url(${solBros})` }}
            >
                <img alt="solslugs logo" className="logo" src={logo} />

                {/* WALLET CONNECTED */}
                {wallet && (
                    <p
                        className="has-text-white is-size-4"
                        style={{ clear: "right" }}
                    >
                        Wallet{" "}
                        {shortenAddress(wallet.publicKey.toBase58() || "")}
                    </p>
                )}
                {wallet && (
                    <p className="has-text-white is-size-4">
                        Balance: {(balance || 0).toLocaleString()} SOL
                    </p>
                )}
                {wallet && (
                    <p className="has-text-white is-size-4">
                        Minted: {itemsRedeemed}/{itemsAvailable}
                    </p>
                )}

                {/* NO WALLET */}
                {!wallet && (
                    <p
                        className="has-text-white is-size-4"
                        style={{ clear: "right" }}
                    >
                        Mint Price: FREE
                    </p>
                )}
                {!wallet && (
                    <p className="has-text-white is-size-4">
                        Total Supply: 10000
                    </p>
                )}
                {!wallet && <p className="has-text-white is-size-4">&nbsp;</p>}
                {!wallet ? (
                    <ConnectButton
                        style={{ marginTop: "1rem" }}
                        className="button is-primary is-normal"
                        color="primary"
                    >
                        Connect Wallet
                    </ConnectButton>
                ) : (
                    <button
                        className={`button is-primary ${
                            isMinting && "is-loading"
                        }`}
                        style={{ marginTop: "1rem" }}
                        disabled={isSoldOut || !isActive}
                        onClick={onMint}
                    >
                        {isSoldOut ? (
                            "SOLD OUT"
                        ) : isActive ? (
                            "MINT"
                        ) : (
                            <Countdown
                                date={startDate}
                                onMount={({ completed }) =>
                                    completed && setIsActive(true)
                                }
                                onComplete={() => setIsActive(true)}
                                renderer={renderCounter}
                            />
                        )}
                    </button>
                )}
            </div>

            <Snackbar
                open={alertState.open}
                autoHideDuration={6000}
                onClose={() => setAlertState({ ...alertState, open: false })}
            >
                <Alert
                    onClose={() =>
                        setAlertState({ ...alertState, open: false })
                    }
                    severity={alertState.severity}
                >
                    {alertState.message}
                </Alert>
            </Snackbar>
        </main>
    );
};

interface AlertState {
    open: boolean;
    message: string;
    severity: "success" | "info" | "warning" | "error" | undefined;
}

const renderCounter = ({ days, hours, minutes, seconds, completed }: any) => {
    return (
        <CounterText>
            {hours + (days || 0) * 24} hours, {minutes} minutes, {seconds}{" "}
            seconds
        </CounterText>
    );
};

export default Home;
