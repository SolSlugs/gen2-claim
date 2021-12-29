import * as anchor from "@project-serum/anchor";
import * as BufferLayout from '@solana/buffer-layout';
import {
    PublicKey,
    TransactionInstruction,
    SignatureStatus,
} from '@solana/web3.js';

import {
    MintLayout,
    TOKEN_PROGRAM_ID,
    Token,
    u64,
} from "@solana/spl-token";

export const CANDY_MACHINE_PROGRAM = new anchor.web3.PublicKey(
    "cndyAnrLdpjq1Ssp1z8xxDsB8dxe7u4HL5Nxi2K5WXZ"
);

const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new anchor.web3.PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export interface CandyMachine {
    id: anchor.web3.PublicKey;
    connection: anchor.web3.Connection;
    program: anchor.Program;
}

interface CandyMachineState {
    candyMachine: CandyMachine;
    itemsAvailable: number;
    itemsRedeemed: number;
    itemsRemaining: number;
    goLiveDate: Date;
    paymentTokenExists: boolean;
    paymentTokenCount: number;
}

function createMintCandyInstruction(
    mintPublicKey: PublicKey,
    mintTokenAddress: PublicKey,
    payer: PublicKey,
    paymentTokenAddress: PublicKey,
) {
    const dataLayout = BufferLayout.struct([
        BufferLayout.u8('instruction'),
        BufferLayout.blob(8, 'amount'),
    ]);

    const data = Buffer.alloc(dataLayout.span);

    dataLayout.encode(
        {
            instruction: 7, // MintTo
            amount: new u64(1).toBuffer(),
        },
        data,
    );

    const keys = [
        {
            pubkey: mintPublicKey,
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: mintTokenAddress,
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: payer,
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: paymentTokenAddress,
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: payer,
            isSigner: false,
            isWritable: false,
        },
    ];

    return new TransactionInstruction({
        keys,
        programId: TOKEN_PROGRAM_ID,
        data,
    });
}

const createAssociatedTokenAccountInstruction = (
    associatedTokenAddress: anchor.web3.PublicKey,
    payer: anchor.web3.PublicKey,
    walletAddress: anchor.web3.PublicKey,
    splTokenMintAddress: anchor.web3.PublicKey
) => {
    const keys = [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
        { pubkey: walletAddress, isSigner: false, isWritable: false },
        { pubkey: splTokenMintAddress, isSigner: false, isWritable: false },
        {
            pubkey: anchor.web3.SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        {
            pubkey: anchor.web3.SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
    ];
    return new anchor.web3.TransactionInstruction({
        keys,
        programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
        data: Buffer.from([]),
    });
};

export const getCandyMachineState = async (
    anchorWallet: anchor.Wallet,
    candyMachineId: anchor.web3.PublicKey,
    connection: anchor.web3.Connection,
    tokenMintPublicKey: PublicKey,
    payer: PublicKey,
): Promise<CandyMachineState> => {
    const provider = new anchor.Provider(connection, anchorWallet, {
        preflightCommitment: "recent",
    });

    const idl = await anchor.Program.fetchIdl(CANDY_MACHINE_PROGRAM, provider);

    const program = new anchor.Program(idl, CANDY_MACHINE_PROGRAM, provider);
    const candyMachine = {
        id: candyMachineId,
        connection,
        program,
    };

    const state: any = await program.account.candyMachine.fetch(candyMachineId);

    const itemsAvailable = state.data.itemsAvailable.toNumber();
    const itemsRedeemed = state.itemsRedeemed.toNumber();
    const itemsRemaining = itemsAvailable - itemsRedeemed;

    let goLiveDate = state.data.goLiveDate.toNumber();
    goLiveDate = new Date(goLiveDate * 1000);

    console.log({
        itemsAvailable,
        itemsRedeemed,
        itemsRemaining,
        goLiveDate,
    });

    /* Address to store the new payment token in for the user */
    const associatedAddress = await getTokenWallet(payer, tokenMintPublicKey);

    const accountInfo = await connection.getAccountInfo(
        associatedAddress,
    );

    let balance = 0;

    if (accountInfo) {
        const { value } = await connection.getTokenAccountBalance(
            associatedAddress,
        );

        balance = Number(value.amount);
    }

    return {
        candyMachine,
        itemsAvailable,
        itemsRedeemed,
        itemsRemaining,
        goLiveDate,
        paymentTokenExists: accountInfo !== null,
        paymentTokenCount: balance,
    };
};

const getMasterEdition = async (
    mint: anchor.web3.PublicKey
): Promise<anchor.web3.PublicKey> => {
    return (
        await anchor.web3.PublicKey.findProgramAddress(
            [
                Buffer.from("metadata"),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                mint.toBuffer(),
                Buffer.from("edition"),
            ],
            TOKEN_METADATA_PROGRAM_ID
        )
    )[0];
};

const getMetadata = async (
    mint: anchor.web3.PublicKey
): Promise<anchor.web3.PublicKey> => {
    return (
        await anchor.web3.PublicKey.findProgramAddress(
            [
                Buffer.from("metadata"),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                mint.toBuffer(),
            ],
            TOKEN_METADATA_PROGRAM_ID
        )
    )[0];
};

const getTokenWallet = async (
    wallet: anchor.web3.PublicKey,
    mint: anchor.web3.PublicKey
) => {
    return (
        await anchor.web3.PublicKey.findProgramAddress(
            [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
            SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
        )
    )[0];
};

export const mintOneToken = async (
    candyMachine: CandyMachine,
    config: anchor.web3.PublicKey, // feels like this should be part of candyMachine?
    payer: anchor.web3.PublicKey,
    treasury: anchor.web3.PublicKey,
    tokenMintPublicKey: PublicKey,
    setAlertState: any,
): Promise<SignatureStatus | null> => {

    const mint = anchor.web3.Keypair.generate();
    const token = await getTokenWallet(payer, mint.publicKey);
    const { connection, program } = candyMachine;
    const metadata = await getMetadata(mint.publicKey);
    const masterEdition = await getMasterEdition(mint.publicKey);

    const rent = await connection.getMinimumBalanceForRentExemption(
        MintLayout.span
    );

    /* Address to store the new payment token in for the user */
    const associatedAddress = await getTokenWallet(payer, tokenMintPublicKey);

    /* Create the token account for the SPL payment token */
    const mintToInstruction = createMintCandyInstruction(
        mint.publicKey,
        token,
        payer,
        associatedAddress,
    );

    const instructions = [];

    instructions.push(
        anchor.web3.SystemProgram.createAccount({
            fromPubkey: payer,
            newAccountPubkey: mint.publicKey,
            space: MintLayout.span,
            lamports: rent,
            programId: TOKEN_PROGRAM_ID,
        }),
        Token.createInitMintInstruction(
            TOKEN_PROGRAM_ID,
            mint.publicKey,
            0,
            payer,
            payer
        ),
        createAssociatedTokenAccountInstruction(
            token,
            payer,
            payer,
            mint.publicKey
        ),
        mintToInstruction,
    );

    const signaturePromise = program.rpc.mintNft({
        accounts: {
            config,
            candyMachine: candyMachine.id,
            payer: payer,
            wallet: treasury,
            mint: mint.publicKey,
            metadata,
            masterEdition,
            mintAuthority: payer,
            updateAuthority: payer,
            tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
        signers: [mint],
        instructions,
        remainingAccounts: [
            {
                pubkey: associatedAddress,
                isSigner: false,
                isWritable: true,
            },
            {
                pubkey: payer,
                isSigner: false,
                isWritable: false,
            },
        ],
    });

    setAlertState({
        open: true,
        message: 'Minting...',
        severity: 'info',
    });

    const signature = await signaturePromise;

    while (true) {
        const status = await connection.getSignatureStatuses([signature]);
        
        if (status === null) {
            await sleep(2000);
        } else {
            return status.value[0];
        }
    }
};

export const shortenAddress = (address: string, chars = 4): string => {
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
