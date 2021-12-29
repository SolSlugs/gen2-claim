import { useEffect, useState } from "react";
import styled from "styled-components";
import Countdown from "react-countdown";
import { Snackbar } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import * as anchor from "@project-serum/anchor";
import {
    LAMPORTS_PER_SOL,
    PublicKey,
    Connection,
} from "@solana/web3.js";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-material-ui";

import gen2 from './assets/gen2.png';
import {
    CandyMachine,
    getCandyMachineState,
    mintOneToken,
    shortenAddress,
} from "./candy-machine";

const ConnectButton = styled(WalletMultiButton)`
    background-color: #c5f1ff !important;
    color: #3e3e3e !important;
    font-size: 30px !important;
`;

const DisconnectButton = styled(WalletMultiButton)`
    background-color: #c5f1ff !important;
    color: #3e3e3e !important;
    font-size: 20px !important;
`;

const CounterText = styled.span``; // add your styles here

export interface HomeProps {
    candyMachineId: PublicKey;
    config: PublicKey;
    connection: Connection;
    startDate: number;
    treasury: PublicKey;
    tokenMintPublicKey: PublicKey;
}

const Item = (props: any) => {
  return (
      <span style={{
          marginTop: '10px',
          ...props.style,
      }}>
          {props.children}
      </span>
  );
}

const Home = (props: HomeProps) => {
    const [isActive, setIsActive] = useState(false); // true when countdown completes
    const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
    const [isMinting, setIsMinting] = useState(false);

    const [paymentTokenExists, setPaymentTokenExists] = useState(false);
    const [paymentTokenCount, setPaymentTokenCount] = useState(0);

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
                itemsRemaining,
                paymentTokenExists,
                paymentTokenCount,
            } = await getCandyMachineState(
                wallet as anchor.Wallet,
                props.candyMachineId,
                props.connection,
                props.tokenMintPublicKey,
                wallet.publicKey,
            );

            setIsSoldOut(itemsRemaining === 0);
            setStartDate(goLiveDate);

            setPaymentTokenExists(paymentTokenExists);
            setPaymentTokenCount(paymentTokenCount);

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
                    props.tokenMintPublicKey,
                    setAlertState,
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
            setIsMinting(false);
            refreshCandyMachineState();
        }
    };

    useEffect(refreshCandyMachineState, [
        wallet,
        props.candyMachineId,
        props.connection,
        props.tokenMintPublicKey,
    ]);

    return (
        <main>
            <img
                src={gen2}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    left: '20px',
                    width: '400px',
                    height: '400px',
                }}
            />
            <div
                className="mint-container"
            >
                {wallet && (
                    <>
                                                
                        {paymentTokenExists && (
                            <>
                                <div style={{ display: 'flex', width: '90%', justifyContent: 'space-between', fontSize: '28px' }}>
                                    <Item>
                                        Wallet: {shortenAddress(wallet.publicKey.toBase58() || "")}
                                    </Item>

                                    <Item>
                                        Mint Cost: Free!
                                    </Item>
                                </div>

                                <div style={{ flexDirection: 'column', display: 'flex', alignItems: 'center', marginTop: '40px' }}>
                                    {paymentTokenCount === 0 && (
                                        <>
                                            <Item style={{ fontSize: '30px' }}>
                                                Congratulations, you have claimed all your generation 2 slugs!
                                            </Item>

                                            <DisconnectButton
                                                style={{ marginTop: '30px' }}
                                                className="button is-primary is-normal"
                                            >
                                                Disconnect Wallet
                                            </DisconnectButton>
                                        </>
                                    )}

                                    {paymentTokenCount > 0 && (
                                        <>
                                            <Item style={{ fontSize: '30px' }}>
                                                {`You can claim ${paymentTokenCount} generation 2 slug${paymentTokenCount === 1 ? '' : 's'}!`}
                                            </Item>

                                            <button
                                                style={{
                                                    marginTop: '30px',
                                                    fontSize: '30px',
                                                    padding: '10px',
                                                    paddingLeft: '20px',
                                                    paddingRight: '20px',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    backgroundColor: '#c5f1ff',
                                                    color: '#3e3e3e',
                                                }}
                                                disabled={isSoldOut || !isActive || isMinting}
                                                onClick={onMint}
                                            >
                                                {isSoldOut ? (
                                                    "SOLD OUT"
                                                ) : isActive ? (
                                                    isMinting ? 'MINTING...' : 'MINT'
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
                                        </>
                                    )}
                                </div>
                            </>
                        )}

                        {candyMachine && !paymentTokenExists && (
                            <>
                                <div style={{ display: 'flex', width: '90%', justifyContent: 'space-between', fontSize: '28px' }}>
                                    <Item>

                                        Wallet: {shortenAddress(wallet.publicKey.toBase58() || "")}
                                    </Item>

                                    <Item>
                                        Mint Cost: Free!
                                    </Item>
                                </div>

                                <Item style={{ marginTop: '60px', width: '600px' }}>
                                    You are not eligible for any generation 2 slugs. Please verify you have the correct wallet address connected.
                                </Item>

                                <Item style={{ marginTop: '40px', width: '600px' }}>
                                    Generation 2 slugs were rewarded to users who burnt two or more generation 1 slugs.
                                </Item>

                                <DisconnectButton
                                    style={{ marginTop: '30px' }}
                                    className="button is-primary is-normal"
                                    color="primary"
                                >
                                    Disconnect Wallet
                                </DisconnectButton>

                                <a href="https://solslugs.com/#/gen2" style={{ color: '#383838', marginTop: '30px' }}>
                                    Verify Eligibility
                                </a>
                            </>
                        )}
                    </>
                )}

                {!wallet && (
                    <>
                        <p>
                            Connect your wallet to mint a generation 2 Sol Slug!
                        </p>

                        <ConnectButton
                            style={{ marginTop: "1rem" }}
                            className="button is-primary is-normal"
                        />
                    </>
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

export interface AlertState {
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
