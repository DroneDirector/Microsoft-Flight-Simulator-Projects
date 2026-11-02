# HD satellite imagery as a Premium subscription

Airline Manager Pro · planning notes · prices checked 2 November 2026

## Status

In the app: **Settings → Satellite → "HD satellite imagery · Premium"**. It is a **demo**: nothing can be bought, no payment is taken, and the imagery stays the built-in Sentinel-2 imagery (Sentinel-2 cloudless 2016 by EOX, CC BY 4.0, which allows commercial use with credit). The note under the option says so.

## The idea

Players switch on Premium and get sharp satellite imagery in the 3D view, with no account or key of their own. The app uses **one Mapbox account owned by the company**. Players pay the subscription; the company pays Mapbox for the imagery tiles shown.

## Where the money goes

1. The player pays the subscription to the company (through Google Play billing on Android, or the store/payment service used on the PC). The store keeps its commission (Google Play: 15 % on subscriptions).
2. Mapbox bills the company's Mapbox account each month for the tiles used by all players together. Mapbox takes no share of the subscription; it only charges per tile.
3. What remains after the store's commission and the Mapbox bill is the company's.

## Mapbox Satellite: prices (Raster Tiles API)

| Tile requests per month (whole account) | Price per 1,000 tile requests |
|---|---|
| First 750,000 | Free |
| 750,001 – 2,000,000 | $0.25 |
| 2,000,001 – 4,000,000 | $0.20 |
| Over 4,000,000 | $0.15 |
| Higher volumes | Ask Mapbox sales for a discount |

Source: https://www.mapbox.com/pricing (Raster Tiles API).

## What it costs per flight (estimate)

How many tiles a flight loads depends on the detail setting, how long the 3D view is open and how much of the flight is near airports. These are estimates to plan with, not measurements:

| Tiles per flight | Cost at $0.25 / 1,000 | Cost at $0.15 / 1,000 |
|---|---|---|
| 1,000 (short visit to the 3D view) | $0.25 | $0.15 |
| 3,000 (typical flight) | $0.75 | $0.45 |
| 6,000 (whole flight in 3D, high detail) | $1.50 | $0.90 |

The free 750,000 tiles a month are for the whole account, so they cover roughly 250 typical flights across all players together, not per player.

What this means for the price: a player who flies 30 flights a month at about 3,000 tiles each costs about $22 a month at $0.25 per 1,000. A subscription of a few dollars would not cover heavy players at list price. Ways to make it work:

- ask Mapbox for volume or game pricing (see below);
- keep tiles on the device as long as Mapbox's terms allow (their tiles come with a 12-hour cache time), so airports flown to often are loaded once;
- show HD imagery only near airports (the last part of the approach and on the ground), with the free Sentinel-2 imagery elsewhere;
- a monthly limit of HD flights per subscription, or a higher price tier.

## What to ask Mapbox (contact sales: https://www.mapbox.com/contact)

1. May a paid game sell access to Mapbox Satellite to its players as a subscription, with the imagery used in a 3D view (draped over terrain)?
2. Is there game or volume pricing, or a per-user (monthly active users) price that fits better than per tile?
3. How long may tiles be kept on the player's device, and may they be kept for offline use?
4. What attribution must be shown on screen, and where?
5. How should the access token be protected: a public token restricted to the app, or a small server that hands out short-lived tokens?
6. Any limits for players in particular countries?

## Other providers (for comparison)

| Provider | Free each month | After that | Notes |
|---|---|---|---|
| Esri ArcGIS Location Platform (World Imagery) | 2,000,000 basemap tiles | $0.15 per 1,000 tiles | Very sharp imagery; check their terms for games |
| Google Map Tiles API, 2D tiles | 100,000 requests | $0.60 per 1,000 | Billing account (card) required |
| Google Photorealistic 3D Tiles | 1,000 sessions (up to 3 h each) | $6.00 per 1,000 | Strict attribution and caching rules |
| MapTiler Cloud | Free plan: 100,000 requests, non-commercial only | Flex plan $30 a month | Satellite style available |
| Stadia Maps | Free plan: no satellite, non-commercial | Standard $80 a month (satellite included) | Starter $20 has no satellite |

Sources: https://location.arcgis.com/pricing/ · https://developers.google.com/maps/billing-and-pricing/pricing · https://www.maptiler.com/cloud/pricing/ · https://stadiamaps.com/pricing/

## Already in the app

- Settings → Satellite → "Sharper imagery at airports: your own imagery service": a player can paste the tile address of their own service (for example MapTiler with their own key). The player is responsible for that service's terms.
- The built-in imagery: Sentinel-2 cloudless 2016 by EOX (CC BY 4.0). Later years of EOX's imagery are non-commercial only.

This is planning information, not legal advice. Each provider's own terms decide what is allowed.
