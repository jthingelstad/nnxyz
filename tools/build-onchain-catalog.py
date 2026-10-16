#!/usr/bin/env python3
"""Build data/onchain.json, the catalog of the collector's nnxyz works on other chains.

Sources: data/onchain-works.json (the Mac's October 16, 2026 recovery of the EVM
holdings, with originals under collection/recovered-onchain/),
curation/research/onchain/tezos.json (the artist's Tezos tokens and the
collector's holdings, from objkt and TzKT) and
curation/research/onchain/tezos-transfers.json (TzKT: transfers of those
tokens into the collector's Tezos wallet). Tezos originals are fetched by
tools/fetch-onchain-sources.py into collection/recovered-tezos/.

Only distinct works are catalogued: a token on a later contract that copies an
earlier one (reissueOf) is recorded under the work it copies. Nothing here is
inferred from titles alone; every identity is chain, contract and token id.
"""

import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXT = {"image/gif": "gif", "image/jpeg": "jpg", "image/png": "png", "video/mp4": "mp4"}
CHAIN_IDS = {"ethereum": 1, "optimism": 10, "polygon": 137, "arbitrum": 42161}
COLLECTOR_TEZOS = "tz1ScjmJyVpN1ph4gGWgbbkWsTRykzAmiNtV"
ARTIST_TEZOS = "tz1SCbhqv5YeGSR23xszDV7xyGaW5HJqrWFy"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def dimensions(path, mime):
    from PIL import Image

    if mime == "video/mp4":
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
             "stream=width,height,nb_frames", "-of", "json", str(path)],
            capture_output=True, text=True, check=True,
        )
        s = json.loads(out.stdout)["streams"][0]
        return int(s["width"]), int(s["height"]), int(s.get("nb_frames") or 0)
    with Image.open(path) as im:
        return im.width, im.height, getattr(im, "n_frames", 1)


def still_for_video(path):
    """A PNG frame one second in, kept beside the original, for the WebP derivatives."""
    still = path.with_name("still.png")
    if not still.exists():
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "1", "-i", str(path),
                        "-frames:v", "1", str(still)], check=True)
    return still


def main():
    recovered = json.loads((ROOT / "data/onchain-works.json").read_text())
    tezos = json.loads((ROOT / "curation/research/onchain/tezos.json").read_text())
    transfers = json.loads((ROOT / "curation/research/onchain/tezos-transfers.json").read_text())
    works = []
    reissues = {}
    for token in recovered["artworks"]:
        if token.get("alreadyInSite"):
            continue
        if token.get("reissueOf"):
            reissues.setdefault(token["reissueOf"], []).append({
                "chain": token["chain"], "chainId": token["chainId"], "contract": token["contract"],
                "tokenId": token["tokenId"], "tokenUrl": token["tokenUrl"], "acquiredAt": token["acquiredAt"],
                "acquisitionHow": token["acquisitionHow"], "wallet": token["wallet"],
            })
            continue
        works.append({
            "id": token["id"], "name": token["name"], "artistName": "nnxyz", "series": token["series"],
            "number": token["number"], "chain": token["chain"], "chainId": token["chainId"],
            "contract": token["contract"], "tokenId": token["tokenId"], "standard": token["standard"],
            "tokenUrl": token["tokenUrl"], "sourcePath": token["imagePath"],
            "imageSHA256": token["imageSHA256"], "imageBytes": token["imageBytes"],
            "imageMimeType": token["imageMimeType"], "width": token["width"], "height": token["height"],
            "frames": token["frames"], "animated": (token["frames"] or 1) > 1,
            "stillPath": None, "stillSHA256": None,
            "imageSourceURI": token["imageSourceURI"], "tokenURI": token["tokenURI"],
            "metadataPath": token["metadataPath"],
            "createdAt": token["acquiredAt"] if token["acquisitionHow"].startswith("mint") else None,
            "createdAtBasis": ("the collector's own mint transaction" if token["acquisitionHow"].startswith("mint")
                               else "unknown: the token was minted by the artist before the transfer"),
            "wallet": token["wallet"], "walletName": token["walletName"],
            "acquiredAt": token["acquiredAt"], "acquisitionHow": token["acquisitionHow"],
            "acquiredFrom": token["acquiredFrom"], "acquisitionPrice": token["acquisitionPrice"],
            "acquisitionPricePerToken": token["acquisitionPricePerToken"],
            "acquisitionTxHash": token["acquisitionTxHash"], "acquisitionNote": token["acquisitionNote"],
            "ownershipEvidence": "chain", "reissues": [],
            "description": None, "collectionDescription": None,
        })
    by_id = {w["id"]: w for w in works}
    for original, copies in reissues.items():
        by_id[original]["reissues"] = copies
    # Tezos
    tokens = {(t["fa_contract"], str(t["token_id"])): t for t in tezos["tokens"]}
    inbound = {}
    for t in transfers:
        key = (t["token.contract.address"], str(t["token.tokenId"]))
        inbound.setdefault(key, []).append(t)
    for holding in tezos["collectorHoldings"]:
        key = (holding["contract"], str(holding["tokenId"]))
        token = tokens[key]
        mime = token["mime"]
        path = ROOT / "collection/recovered-tezos" / key[0] / key[1] / f"original.{EXT[mime]}"
        if not path.exists():
            raise SystemExit(f"Missing Tezos original (run tools/fetch-onchain-sources.py): {path}")
        width, height, frames = dimensions(path, mime)
        still = still_for_video(path) if mime == "video/mp4" else None
        received = sorted(inbound.get(key, []), key=lambda t: t["timestamp"])
        first = received[0] if received else None
        works.append({
            "id": f"tezos-{key[0]}-{key[1]}", "name": token["name"].strip(), "artistName": "nnxyz",
            "series": token["fa"]["name"], "number": None, "chain": "tezos", "chainId": None,
            "contract": key[0], "tokenId": key[1], "standard": "fa2",
            "tokenUrl": f"https://objkt.com/tokens/{key[0]}/{key[1]}",
            "sourcePath": str(path.relative_to(ROOT)), "imageSHA256": sha(path), "imageBytes": path.stat().st_size,
            "imageMimeType": mime, "width": width, "height": height, "frames": frames, "animated": frames > 1,
            "stillPath": str(still.relative_to(ROOT)) if still else None,
            "stillSHA256": sha(still) if still else None,
            "imageSourceURI": token["artifact_uri"], "tokenURI": None, "metadataPath": None,
            "createdAt": token["timestamp"].replace("+00:00", "Z"), "createdAtBasis": "token mint on Tezos (objkt)",
            "wallet": COLLECTOR_TEZOS, "walletName": "jthingelstad (Tezos)",
            "acquiredAt": first["timestamp"] if first else None,
            "acquisitionHow": ("transfer from artist" if first and first["from.address"] == ARTIST_TEZOS else
                               "transfer" if first else "unknown"),
            "acquiredFrom": first["from.address"] if first else None,
            "acquisitionPrice": None, "acquisitionPricePerToken": None,
            "acquisitionTxHash": str(first["transactionId"]) if first else None,
            "acquisitionNote": ("Sales are not distinguished from gifts on Tezos in this record; the transfer "
                                "came from the artist's address."),
            "ownershipEvidence": "chain", "reissues": [],
            "editionSize": token["supply"], "heldQuantity": holding["quantity"],
            "description": token.get("description"), "collectionDescription": token["fa"].get("description"),
        })
    catalog = {
        "schemaVersion": 1,
        "collectionId": "after-nifty-ink",
        "title": "After Nifty Ink",
        "builtAt": "2026-10-16T17:00:00Z",
        "method": __doc__.strip(),
        "sourceFiles": ["data/onchain-works.json", "curation/research/onchain/tezos.json",
                        "curation/research/onchain/tezos-transfers.json"],
        "counts": {"works": len(works), "evmWorks": len(by_id), "tezosWorks": len(works) - len(by_id),
                   "reissuedTokensHeld": sum(len(w["reissues"]) for w in works)},
        "artworks": works,
    }
    (ROOT / "data/onchain.json").write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(catalog["counts"]))


if __name__ == "__main__":
    sys.exit(main())
