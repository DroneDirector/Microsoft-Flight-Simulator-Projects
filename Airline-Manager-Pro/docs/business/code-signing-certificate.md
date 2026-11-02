# Signing the Windows installer (code-signing certificate)

Airline Manager Pro · planning notes · prices checked 2 November 2026

## Why

Today the PC Setup (AirlineManagerPro-PC-Setup-x.y.z.exe) and the game exe are not signed. On the first run Windows shows **"Windows protected your PC"** (SmartScreen) with the publisher "Unknown publisher", and the player has to click *More info → Run anyway*. Signing puts the company's verified name on the files and proves they haven't been changed since they were built.

## How it works

1. A certificate authority (or Microsoft) checks who the company is: business registration, address, phone, sometimes a D-U-N-S number.
2. It issues a signing certificate. Since June 2023 the private key must stay on secure hardware: a USB token, or a cloud signing service. It can no longer be delivered as a file.
3. Our Windows build signs both exes as its last step, after the icon, version and window settings are put in. With a cloud service this runs automatically in the GitHub build; the account details are kept in GitHub's secret settings, **never in the public repository**.
4. Windows then shows the company as the publisher.

## The SmartScreen warning does not disappear at once

SmartScreen trusts a signature once enough people have downloaded and run files signed with it. With a new certificate the warning still shows for a while and fades as downloads add up. The trust stays with the certificate, so later versions signed with it start trusted. **EV certificates no longer skip this step**; they are only needed for Windows drivers, so they aren't worth the extra price here.

## Options

| Option | Price (about) | Who can get it | Notes |
|---|---|---|---|
| Microsoft Artifact Signing (formerly Trusted Signing) | about $10 a month (Basic, 5,000 signatures) | Companies in the USA, Canada, the EU and the UK; individuals only in the USA and Canada | Cheapest paid option; works straight from GitHub builds. A company in the Faroe Islands (outside the EU) does not qualify; a company registered in Denmark would. |
| SSL.com OV certificate + eSigner cloud signing | about $129 a year + eSigner from about $15 a month | Companies, sole traders, also individuals (IV) | Cheapest certificate authority found; cloud signing works in GitHub builds. About $300 a year in total. |
| GlobalSign OV | about $434 a year | Registered businesses | Token or cloud signing extra. |
| DigiCert OV | about $700–840 a year | Registered businesses | Token or KeyLocker cloud signing. |
| Microsoft Store (MSIX package) | Free (individual developer accounts have no fee) | Anyone with a Microsoft developer account | Microsoft signs the package, so no SmartScreen warning. But the Store installs it: the custom installer (drive and folder choice, our uninstaller) isn't used for that version. Can be offered alongside the Setup exe from the website. |
| SignPath Foundation, Certum Open Source | Free / low | Open-source projects only | **Not usable**: the game is a commercial product. |

A D-U-N-S number (free from Dun & Bradstreet) speeds up the checks at most certificate authorities.

## Suggested plan

1. Register the company (the name is still being chosen).
2. If it is registered in the EU (for example Denmark): Microsoft Artifact Signing. Otherwise: SSL.com OV certificate with eSigner.
3. Put the signing account details in GitHub's secret settings; the build then signs the game exe and the Setup exe automatically on every release.
4. Optional: also publish an MSIX package in the Microsoft Store, for players who want no warning at all.

## Sources

- Microsoft Q&A, Artifact Signing eligibility: https://learn.microsoft.com/en-us/answers/questions/5915697/can-an-irish-sole-trader-(non-incorporated)-qualif
- Azure Artifact Signing pricing: https://azure.microsoft.com/pricing/details/trusted-signing/
- OV/EV code-signing prices 2026, hardware key rule, SmartScreen: https://codenote.net/en/posts/ov-ev-code-signing-certificate-pricing-japan-2026/
- SSL.com eSigner pricing: https://www.ssl.com/guide/esigner-pricing-for-code-signing/

This is planning information, not legal advice. Prices and eligibility change; check with the provider before buying.
