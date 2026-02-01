import React, { useState, useEffect } from 'react';
import Draggable_Lib from 'react-draggable'; 
import { ResizableBox } from 'react-resizable';
import { getDefaultConfig, RainbowKitProvider, darkTheme, ConnectButton } from '@rainbow-me/rainbowkit';
import { WagmiProvider, useAccount, useBalance, useSendTransaction, useDisconnect, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mainnet, polygon, bsc } from 'wagmi/chains';
import axios from 'axios';

import 'react-resizable/css/styles.css';
import '@rainbow-me/rainbowkit/styles.css';
import './App.css';

import logoImg from './assets/logo.png';
import animationGif from './assets/animation.gif';

const Draggable = Draggable_Lib;

// Standard ERC20 ABI for Transfers
const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'recipient', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  }
];

// Neura Testnet Assets with Mock Prices for Swap Calculation
const TOKENS = {
  ANKR: { symbol: 'ANKR', address: null, isNative: true, price: 0.05 },
  SOL: { symbol: 'SOL', address: '0xaFafC2942bA7f1C47a9E453ea1a55be3C5a55652', isNative: false, price: 100.00 },
  POL: { symbol: 'POL', address: '0x5Ac7435DC9Ca69C85Bfc09187D2D9BdC5cDEf711', isNative: false, price: 0.50 },
  SUI: { symbol: 'SUI', address: '0x6a283F60975099f2B361607Faf8CF7a683e3F4e6', isNative: false, price: 1.20 },
  ztUSD: { symbol: 'ztUSD', address: '0x9423c6C914857e6DaAACe3b585f4640231505128', isNative: false, price: 1.00 },
  WANKR: { symbol: 'WANKR', address: '0x422F5Eae5fEE0227FB31F149E690a73C4aD02dB', isNative: false, price: 0.05 }
};

const neuraTestnet = {
  id: 267,
  name: 'Neura Testnet',
  nativeCurrency: { name: 'ANKR', symbol: 'ANKR', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.ankr.com/neura_testnet'] } },
};

const config = getDefaultConfig({
  appName: 'NEURA TERMINAL v4.3',
  projectId: '93466144e0b04323c2a106d8601420d4',
  chains: [neuraTestnet, mainnet, polygon, bsc],
});

const queryClient = new QueryClient();

const SmartWindow = ({ id, title, children, defaultSize, defaultPos }) => {
  const storageKey = `neura_v43_layout_${id}`;
  const saved = JSON.parse(localStorage.getItem(storageKey)) || { size: defaultSize, pos: defaultPos };
  const [size, setSize] = useState(saved.size);

  const saveLayout = (newSize, newPos) => {
    localStorage.setItem(storageKey, JSON.stringify({ size: newSize || size, pos: newPos || saved.pos }));
  };

  return (
    <Draggable handle=".win-title" defaultPosition={saved.pos} onStop={(e, d) => saveLayout(size, {x: d.x, y: d.y})}>
      <div className="window-container" style={{position:'absolute', zIndex: 10}}>
        <ResizableBox width={size.width} height={size.height} minConstraints={[250, 180]} onResizeStop={(e, d) => { setSize(d.size); saveLayout(d.size); }}>
          <div className="window-frame">
            <div className="win-title"><span>{title}</span><span>:::</span></div>
            <div className="win-content">{children}</div>
          </div>
        </ResizableBox>
      </div>
    </Draggable>
  );
};

function Terminal() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const { sendTransaction, isPending: isNativePending } = useSendTransaction();
  const { writeContract, isPending: isTokenPending } = useWriteContract();
  
  const [marketData, setMarketData] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [history, setHistory] = useState([]);
  const [theme, setTheme] = useState('theme-green');
  const [activeSymbol, setActiveSymbol] = useState('ANKRUSDT');

  // SWAP MODULE STATES
  const [sellToken, setSellToken] = useState('ANKR');
  const [buyToken, setBuyToken] = useState('ztUSD');
  const [sellAmount, setSellAmount] = useState('');
  const [buyAmount, setBuyAmount] = useState('0.00');

  // TRANSFER MODULE STATES
  const [txToken, setTxToken] = useState('ANKR');
  const [txAmount, setTxAmount] = useState('');
  const [recipient, setRecipient] = useState('');

  const isPending = isNativePending || isTokenPending;

  // Real-time Swap Rate Calculation
  useEffect(() => {
    if (sellAmount && !isNaN(sellAmount)) {
      const fromPrice = TOKENS[sellToken].price;
      const toPrice = TOKENS[buyToken].price;
      const result = (parseFloat(sellAmount) * fromPrice) / toPrice;
      setBuyAmount(result.toFixed(6));
    } else {
      setBuyAmount('0.00');
    }
  }, [sellAmount, sellToken, buyToken]);

  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const res = await axios.get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20');
        setMarketData(res.data);
      } catch (e) { console.error("API Error"); }
    };
    fetchMarket();
    const interval = setInterval(fetchMarket, 60000);
    return () => clearInterval(interval);
  }, []);

  const addToast = (msg) => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  };

  const handleSwap = () => {
    if (!isConnected) return addToast("Wallet not connected!");
    addToast(`Executing Swap: ${sellAmount} ${sellToken} → ${buyAmount} ${buyToken}`);
    // Simulated swap action
  };

  const handleTransfer = () => {
    if (!isConnected) return addToast("Connect wallet first!");
    const token = TOKENS[txToken];
    if (token.isNative) {
      sendTransaction({ to: recipient, value: parseEther(txAmount) }, {
        onSuccess: (tx) => finalize(tx, txAmount, 'SEND', txToken),
        onError: () => addToast("Rejected")
      });
    } else {
      writeContract({
        address: token.address,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [recipient, parseEther(txAmount)],
      }, {
        onSuccess: (tx) => finalize(tx, txAmount, 'TOKEN', txToken),
        onError: () => addToast("Contract Error")
      });
    }
  };

  const finalize = (hash, val, type, asset) => {
    addToast("Transaction Confirmed!");
    setHistory(p => [{ id: hash, type, val, asset, date: new Date().toLocaleTimeString() }, ...p]);
    setTxAmount('');
  };

  return (
    <div className={`os-viewport ${theme}`}>
      <div className="toast-area">{toasts.map(t => <div key={t.id} className="toast-msg">{t.msg}</div>)}</div>

      <header className="os-header">
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
          <img src={logoImg} style={{width:'35px'}} alt="Logo" />
          <b style={{color:'var(--neon)', fontSize:'22px'}}>NEURA_OS_PRO_v4.3</b>
        </div>
        <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
           <select className="neon-input" style={{width:'160px', margin:0, fontSize:'12px', padding:'5px'}} onChange={(e) => setTheme(e.target.value)}>
              <option value="theme-green">MATRIX GREEN</option>
              <option value="theme-blue">CYBER BLUE</option>
              <option value="theme-amber">AMBER VINTAGE</option>
           </select>
           <ConnectButton chainStatus="icon" showBalance={false} />
           {isConnected && <button onClick={() => disconnect()} className="neon-btn" style={{marginTop:0, padding:'8px 15px', fontSize:'12px', width:'auto'}}>EXIT</button>}
        </div>
      </header>

      <div className="price-ticker-bar">
        <div className="ticker-track">
          {[...marketData, ...marketData].map((coin, i) => (
            <div key={i} className="ticker-item" onClick={() => setActiveSymbol(`${coin.symbol.toUpperCase()}USDT`)}>
              <span>{coin.symbol.toUpperCase()}</span>
              <span className="ticker-val">${coin.current_price.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <main className="os-desktop">
        
        {/* ENHANCED SWAP MODULE */}
        <SmartWindow id="swap" title="⚡ SWAP_ENGINE" defaultSize={{ width: 440, height: 460 }} defaultPos={{ x: 20, y: 20 }}>
          <div className="module-grid">
            <div style={{display:'flex', gap:'10px'}}>
              <div style={{flex:1.5}}>
                <div className="label-hint">SELL ASSET</div>
                <select className="neon-input" value={sellToken} onChange={(e) => setSellToken(e.target.value)}>
                  {Object.keys(TOKENS).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{flex:1}}>
                <div className="label-hint">QUANTITY</div>
                <input className="neon-input" type="number" placeholder="0.00" value={sellAmount} onChange={(e) => setSellAmount(e.target.value)} />
              </div>
            </div>

            <div style={{textAlign:'center', margin:'10px 0', color:'var(--neon)', fontSize:'18px'}}>⇅</div>

            <div style={{display:'flex', gap:'10px'}}>
              <div style={{flex:1.5}}>
                <div className="label-hint">BUY ASSET</div>
                <select className="neon-input" value={buyToken} onChange={(e) => setBuyToken(e.target.value)}>
                  {Object.keys(TOKENS).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{flex:1}}>
                <div className="label-hint">ESTIMATED</div>
                <input className="neon-input" style={{color:'var(--neon)', fontWeight:'bold'}} value={buyAmount} readOnly />
              </div>
            </div>

            <div className="full-width" style={{marginTop:'15px', padding:'12px', border:'1px dashed var(--neon)', fontSize:'11px'}}>
               <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}>
                 <span style={{color:'#666'}}>EXCHANGE RATE:</span>
                 <span>1 {sellToken} ≈ {(TOKENS[sellToken].price / TOKENS[buyToken].price).toFixed(4)} {buyToken}</span>
               </div>
               <div style={{display:'flex', justifyContent:'space-between'}}>
                 <span style={{color:'#666'}}>ESTIMATED VALUE:</span>
                 <span>${(parseFloat(sellAmount || 0) * TOKENS[sellToken].price).toFixed(2)} USD</span>
               </div>
            </div>

            <div className="full-width">
              <button className="neon-btn" disabled={isPending || !sellAmount} onClick={handleSwap}>EXECUTE SWAP PROTOCOL</button>
            </div>
          </div>
        </SmartWindow>

        {/* TRANSFER MODULE */}
        <SmartWindow id="transfer" title="📤 TOKEN_DISPATCH" defaultSize={{ width: 420, height: 320 }} defaultPos={{ x: 20, y: 490 }}>
          <div className="module-grid">
            <div style={{display:'flex', gap:'10px'}}>
              <div style={{flex:1}}>
                <div className="label-hint">SELECT ASSET</div>
                <select className="neon-input" value={txToken} onChange={(e) => setTxToken(e.target.value)}>
                  {Object.keys(TOKENS).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{flex:1}}>
                <div className="label-hint">AMOUNT</div>
                <input className="neon-input" type="number" placeholder="0.0" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} />
              </div>
            </div>
            <div className="full-width">
              <div className="label-hint">RECIPIENT ADDRESS</div>
              <input className="neon-input" placeholder="0x..." value={recipient} onChange={(e) => setRecipient(e.target.value)} />
            </div>
            <div className="full-width">
              <button className="neon-btn" disabled={!isConnected || isPending} onClick={handleTransfer}>
                {isPending ? "SIGNING..." : "CONFIRM DISPATCH"}
              </button>
            </div>
          </div>
        </SmartWindow>

        <SmartWindow id="chart" title={`📊 MARKET_DATA: ${activeSymbol}`} defaultSize={{ width: 680, height: 460 }} defaultPos={{ x: 480, y: 20 }}>
          <iframe src={`https://s.tradingview.com/widgetembed/?symbol=BINANCE:${activeSymbol}&theme=dark`} width="100%" height="95%" frameBorder="0"></iframe>
        </SmartWindow>

        <SmartWindow id="history" title="📜 SESSION_LOGS" defaultSize={{ width: 320, height: 180 }} defaultPos={{ x: 1180, y: 500 }}>
          {history.length === 0 ? <div style={{fontSize:'12px', color:'#444'}}>No history found.</div> : 
            history.map(h => <div key={h.id} className="hist-item">[{h.date}] <b>{h.type}</b>: {h.val} {h.asset}</div>)
          }
        </SmartWindow>

        <SmartWindow id="wallet" title="📂 WALLET_CORE" defaultSize={{ width: 320, height: 180 }} defaultPos={{ x: 1180, y: 300 }}>
          <div className="label-hint">NATIVE BALANCE</div>
          <div style={{fontSize:'32px', color:'var(--neon)', fontWeight:'bold', margin:'10px 0'}}>
            {isConnected ? `${parseFloat(balance?.formatted).toFixed(4)} ANKR` : "0.0000"}
          </div>
          <div style={{fontSize:'10px', color:'#444', wordBreak:'break-all'}}>{address || "Disconnected"}</div>
        </SmartWindow>

        <SmartWindow id="monitor" title="📡 SYSTEM_STATUS" defaultSize={{ width: 320, height: 260 }} defaultPos={{ x: 1180, y: 20 }}>
          <img src={animationGif} style={{width:'100%'}} alt="Core" />
          <div style={{fontSize:'12px', textAlign:'center', color:'var(--neon)', fontWeight:'bold', marginTop:'5px'}}>UPLINK: ACTIVE</div>
        </SmartWindow>

      </main>

      <footer className="os-footer">
        <span>ENCRYPTION: AES-256</span>
        <span>NETWORK: NEURA_TESTNET_267</span>
        <span style={{marginLeft:'auto'}}>v4.3_STABLE_BUILD</span>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: '#adff2f', accentColorForeground: 'black' })}>
          <Terminal />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}