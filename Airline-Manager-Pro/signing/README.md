# Test signing key

`test-signing.jks` signs the test APKs built on GitHub, so every new build installs
over the previous one and keeps the app's saved data.

- Used only for test builds (sideloaded APKs from Releases).
- The Google Play release will be signed with a separate, private upload key that is never stored in this repository.
