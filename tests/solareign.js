const anchor = require("@coral-xyz/anchor");
const { assert } = require("chai");

describe("solareign", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.Solareign;
  const user = anchor.workspace.Solareign.provider.wallet;

  it("Is initialized!", async () => {
    const tx = await program.methods.initialize().rpc();
  });

  it("Mints a Hero", async () => {
    const [heroPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("hero"), user.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .mintHero("Arthas", 0)
      .accounts({
        hero: heroPda,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const hero = await program.account.hero.fetch(heroPda);
    assert.equal(hero.name, "Arthas");
    assert.equal(hero.path, 0);
    assert.equal(hero.level, 1);
    
    // Stats sum should be exactly 50
    const statsSum = hero.strength + hero.skill + hero.agility + hero.constitution + hero.luck;
    assert.equal(statsSum, 50);
  });

  it("Plays a PvE Mission and gains levels", async () => {
    const [heroPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("hero"), user.publicKey.toBuffer()],
      program.programId
    );

    // Run hard mission (adds 30 XP, 15 Aurum) 4 times to hit level 2 (100 XP)
    for(let i = 0; i < 4; i++) {
        await program.methods
        .pveMission(2)
        .accounts({
            hero: heroPda,
            user: user.publicKey,
        })
        .rpc();
    }

    const hero = await program.account.hero.fetch(heroPda);
    assert.equal(hero.level, 2);
    assert.equal(hero.xp, 20); // 120 XP earned - 100 for level -> 20 remaining
    assert.equal(hero.aurumBalance.toNumber(), 60); // 15 * 4 = 60
    assert.equal(hero.unallocatedPoints, 3); // Gained 3 points from lvl up
  });

  it("Allocates Attributes using Aurum", async () => {
    const [heroPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("hero"), user.publicKey.toBuffer()],
      program.programId
    );

    const heroBefore = await program.account.hero.fetch(heroPda);
    const cost = 2 * 10; // 2 points = 20 aurum

    await program.methods
      .allocateAttributes(2, 0, 0, 0, 0) // +2 strength
      .accounts({
        hero: heroPda,
        user: user.publicKey,
      })
      .rpc();

    const heroAfter = await program.account.hero.fetch(heroPda);
    assert.equal(heroAfter.strength, heroBefore.strength + 2);
    assert.equal(heroAfter.aurumBalance.toNumber(), heroBefore.aurumBalance.toNumber() - cost);
    assert.equal(heroAfter.unallocatedPoints, 1); // 3 - 2 = 1 left
  });
});
