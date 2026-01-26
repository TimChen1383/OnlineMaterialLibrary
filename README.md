# OnlineMaterialLibrary (WIP. Temporary name)
Due to the shader language and the node based design of the game engine, materials are usually hard to share across multiple platforms. Which means you can't see it on web browser, hard to share with other people and the material can only be use in single platform like Unreal Engine.

This platform is based on Slang(https://shader-slang.org/), which supports multiple backend targets for portable code deployment across diverse APIs and platforms.
It cludes features below:

- ***Slang*** : Code based. Based on the industry standard shader language Slang
- ***Cross Platform*** : Write once and server will compile to code for multiple platforms
- ***Realtime Preview*** : Can be converted and demostrate in realtime through Web Browser
- ***Game Engine Support*** : Can be converted and export to game engine like Unreal Engine and Unity
- ***Library*** : Storing ready to use materials as library on the platform
- ***Sharing*** : Easy to share with other people


***High-Level Architecture***
<img width="858" height="252" alt="architecture" src="https://github.com/user-attachments/assets/89e871d2-2fda-497d-bcd2-f9e067e8b2f0" />

***Compiler***
<img width="1265" height="710" alt="Slang" src="https://github.com/user-attachments/assets/6e1983ae-216f-45b2-92b0-3ac921fd6d23" />

***Shader Library***
<img width="1885" height="901" alt="library" src="https://github.com/user-attachments/assets/7ae8cfbd-5527-4ade-b4a4-6220a13cff86" />

***Code Editor and Compiler***
<img width="1919" height="902" alt="Editor" src="https://github.com/user-attachments/assets/c0e41219-45eb-4586-aad1-544fa49841ab" />

***Cross Platform Export***
<img width="1917" height="913" alt="Export" src="https://github.com/user-attachments/assets/e757cd8f-1764-40e0-af2a-3411b7146229" />
