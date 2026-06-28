// =========== CONSTANTS ==========
const MAX_PLAYERS = 9;
const DEFAULT_CHIPS = 1000;
const DEFAULT_FIRST_PLACE_PAYOUT = 1000;
const MONTE_CARLO_SAMPLES = 10000; // Fewer samples = faster but less accurate
// const MONTE_CARLO_SAMPLES = 100000; // More samples = slower but more accurate

// =========== STATE ===========
let players = [];
let payouts = [];

// =========== DOM ELEMENTS ===========
const numPlayersSelect = document.getElementById('numPlayers');
const playerInputsDiv = document.getElementById('playerInputs');
const payoutInputsDiv = document.getElementById('payoutInputs');
const playerCountBadge = document.getElementById('playerCountBadge');
const payoutCountBadge = document.getElementById('payoutCountBadge');
const resultsDiv = document.getElementById('results');
const resultsContent = document.getElementById('resultsContent');
const loadingDiv = document.getElementById('loading');
const calculateBtn = document.getElementById('calculateBtn');
const explanationDiv = document.getElementById('explanation');
const progressText = document.getElementById('progressText');
const resetBtn = document.getElementById('resetBtn');
const addPayoutsBtn = document.getElementById('addPayoutsBtn');
const themeToggleBtn = document.querySelector('.theme-toggle');

// =========== INITIALIZATION ===========
// Set default number of players and initialize
numPlayersSelect.value = 2;
updatePlayerInputs();
updatePayoutInputs();
loadThemePreference();

// =========== EVENT LISTENERS ===========
numPlayersSelect.addEventListener('change', () => {
    updatePlayerInputs();
    updatePayoutInputs();
});

resetBtn.addEventListener('click', resetForm);
addPayoutsBtn.addEventListener('click', addDefaultPayouts);
calculateBtn.addEventListener('click', calculateICM);
themeToggleBtn.addEventListener('click', toggleTheme);

// =========== THEME FUNCTIONS ===========
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

// =========== INPUT MANAGEMENT ===========
function updatePlayerInputs() {
    const numPlayers = parseInt(numPlayersSelect.value);
    playerInputsDiv.innerHTML = '';

    for (let i = 0; i < numPlayers; i++) {
        const playerRow = document.createElement('div');
        playerRow.className = 'player-row';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = `Player ${i + 1}`;
        nameInput.title = `Name of Player ${i + 1}`;
        nameInput.ariaLabel = `Name of Player ${i + 1}`;
        nameInput.value = `Player ${i + 1}`; // Default name

        const stackInput = document.createElement('input');
        stackInput.type = 'number';
        stackInput.placeholder = 'Chip stack';
        stackInput.min = '1';
        stackInput.title = 'Enter chip stack (must be >= 1)';
        stackInput.ariaLabel = `Chip stack for Player ${i + 1}`;
        stackInput.value = DEFAULT_CHIPS; // Default: 1000 chips

        playerRow.appendChild(nameInput);
        playerRow.appendChild(stackInput);
        playerInputsDiv.appendChild(playerRow);
    }

    playerCountBadge.textContent = `${numPlayers} players`;
    players = Array.from({ length: numPlayers }, (_, i) => ({
        name: `Player ${i + 1}`,
        stack: DEFAULT_CHIPS
    }));
}

function updatePayoutInputs() {
    const numPlayers = parseInt(numPlayersSelect.value);
    payoutInputsDiv.innerHTML = '';

    for (let i = 0; i < numPlayers; i++) {
        const payoutRow = document.createElement('div');
        payoutRow.className = 'payout-row';

        const placeLabel = document.createElement('label');
        placeLabel.textContent = `${i + 1}th place payout ($)`;
        placeLabel.htmlFor = `payout-${i}`;

        const payoutInput = document.createElement('input');
        payoutInput.type = 'number';
        payoutInput.id = `payout-${i}`;
        payoutInput.placeholder = '0';
        payoutInput.min = '0';
        payoutInput.title = 'Payout for this place (must be >= 0)';
        payoutInput.ariaLabel = `Payout for ${i + 1}th place`;
        payoutInput.value = i === 0 ? DEFAULT_FIRST_PLACE_PAYOUT : 0; // Default: $1000 for 1st place

        payoutRow.appendChild(placeLabel);
        payoutRow.appendChild(payoutInput);
        payoutInputsDiv.appendChild(payoutRow);
    }

    payoutCountBadge.textContent = `${numPlayers} places`;
    payouts = Array.from({ length: numPlayers }, (_, i) =>
        i === 0 ? DEFAULT_FIRST_PLACE_PAYOUT : 0
    );
}

function collectInputs() {
    const numPlayers = parseInt(numPlayersSelect.value);

    // Collect players
    const playerRows = playerInputsDiv.querySelectorAll('.player-row');
    players = [];
    for (let i = 0; i < numPlayers; i++) {
        const inputs = playerRows[i].querySelectorAll('input');
        const name = inputs[0].value.trim() || `Player ${i + 1}`;
        const stack = Math.max(1, parseInt(inputs[1].value) || DEFAULT_CHIPS);
        players.push({ name, stack });
    }

    // Collect payouts
    const payoutRows = payoutInputsDiv.querySelectorAll('.payout-row');
    payouts = [];
    for (let i = 0; i < numPlayers; i++) {
        const input = payoutRows[i].querySelector('input');
        const payout = Math.max(0, parseInt(input.value) || (i === 0 ? DEFAULT_FIRST_PLACE_PAYOUT : 0));
        payouts.push(payout);
    }

    return { players, payouts };
}

function resetForm() {
    // Reset player inputs
    playerInputsDiv.querySelectorAll('input').forEach(input => {
        if (input.type === 'text') input.value = '';
        else input.value = DEFAULT_CHIPS;
    });

    // Reset payout inputs
    payoutInputsDiv.querySelectorAll('input').forEach((input, i) => {
        input.value = i === 0 ? DEFAULT_FIRST_PLACE_PAYOUT : 0;
    });

    // Update state
    players = [];
    payouts = [];

    // Hide results
    resultsDiv.style.display = 'none';
    explanationDiv.style.display = 'none';
}

function addDefaultPayouts() {
    const numPlayers = parseInt(numPlayersSelect.value);
    const payoutRows = payoutInputsDiv.querySelectorAll('.payout-row');

    const tournamentPayouts = {
        2: [100, 50],
        3: [100, 60, 40],
        4: [100, 70, 50, 30],
        5: [100, 70, 55, 40, 25],
        6: [100, 75, 60, 45, 30, 20],
        7: [100, 75, 65, 50, 35, 25, 15],
        8: [100, 80, 70, 60, 45, 35, 25, 15],
        9: [100, 80, 70, 60, 50, 40, 30, 20, 10]
    };

    const selectedPayouts = tournamentPayouts[numPlayers] || new Array(numPlayers).fill(0);
    payoutRows.forEach((row, i) => {
        const input = row.querySelector('input');
        if (selectedPayouts[i] !== undefined) {
            input.value = selectedPayouts[i] * 1000; // Scale to dollars
        }
    });

    // Update payouts array
    payouts = selectedPayouts.map(p => p * 1000);
}

// =========== ICM CALCULATION (SIMPLIFIED) ===========
function approximateICMWithMonteCarlo(stacks, payouts, samples = MONTE_CARLO_SAMPLES) {
    console.log(`[DEBUG] Starting Monte Carlo with ${samples} samples...`);
    const n = stacks.length;
    const totalChips = stacks.reduce((sum, stack) => sum + stack, 0);
    const totalPayout = payouts.reduce((sum, p) => sum + p, 0);
    const icmValues = new Array"n).fill(0.0);

    for (let s = 0; s < samples: s++) {
        // Generate a random permutation (weighted by stack sizes)
        const permutation = [];
        const remainingStacks = [...stacks];
        let remainingTotal = totalChips;

        for (let i = 0; i < n; i++) {
            const totalRemaining = remainingStacks.reduce((sum, stack) => sum + stack, 0);
            const random = Math.random() * totalRemaining;
            let cumulative = 0;
            let selectedIndex = 0;

            for (let j = 0; j < remainingStacks.length; j++) {
                cumulative += remainingStacks[j];
                if (random <= cumulative) {
                    selectedIndex = j;
                    break;
                }
            }
            permutation.push(remainingStacks.splice(selectedIndex, 1)[0]);
        }

        // Calculate probability of this permutation
        let probability = 1.0;
        let remaining = totalChips;
        for (let i = 0; i < n; i++) {
            const stack = permutation[i];
            probability *= stack / remaining;
            remaining -= stack;
        }

        // Add to ICM values (scaled by payouts)
        for (let pos = 0; pos < n; pos++) {
            const playerIdx = stacks.indexOf(permutation[pos]);
            icmValues[playerIdx] += probability * payouts[pos];
        }
    }

    // Normalize to total payout
    const totalICM = icmValues.reduce((sum, val) => sum + val, 0);
    const scaleFactor = totalPayout / totalICM;
    const scaledICM = icmValues.map(val => val * scaleFactor);

    console.log(`[DEBUG] Monte Carlo raw ICM:`, icmValues);
    console.log(`[DEBUG] Scaled ICM:`, scaledICM);
    console.log(`[DEBUG] Total ICM after scaling: ${scaledICM.reduce((sum, val) => sum + val, 0)}`);

    return scaledICM;
}

function calculateICM() {
    collectInputs();
    const numPlayers = players.length;
    const totalChips = players.reduce((sum, p) => sum + p.stack, 0);
    const totalPayout = payouts.reduce((sum, p) => sum + p, 0);

    // Input validation
    if (totalChips === 0) {
        alert('Error: Total chips must be greater than 0.');
        return;
    }
    if (totalPayout === 0) {
        alert('Error: Total payout must be greater than 0.');
        return;
    }

    // Determine if Monte Carlo should be used
    useMonteCarlo = numPlayers > 8;
    console.log(`[DEBUG] Players: ${numPlayers}, Use Monte Carlo: ${useMonteCarlo}`); // Debug log

    if (useMonteCarlo) {
        if (!confirm(`Use Monte Carlo approximation for ${numPlayers} players? (Faster but less precise)`)) {
            return;
        }
        console.log(`[DEBUG] Running Monte Carlo with ${MONTE_CARLO_SAMPLES} samples...`); // Debug log
    }

    // Show loading
    loadingDiv.style.display = 'block';
    calculateBtn.disabled = true;
    resultsDiv.style.display = 'none';
    explanationDiv.style.display = 'none';
    progressText.textContent = useMonteCarlo ? 'Running Monte Carlo..-' : 'Generating permutations...';

    setTimeout(() => {
        try {
            const stacks = players.map(p => p.stack);
            const payoutArray = payouts.slice();
            let icmValues;

            if (useMonteCarlo) {
                // Monte Carlo approximation
                icmValues = approximateICMWithMonteCarlo(stacks, payoutArray, MONTE_CARLO_SAMPLES);
                console.log(`[DEBUG]' Monte Carlo completed. ICM Values:`, icmValues); // Debug log
                progressText.textContent = 'Monte Carlo completed.';
            } else {
                // Exact calculation
                icmValues = new Array(numPlayers).fill(0.0);
                const totalPermutations = Number(factorial(BigInt(numPlayers)));
                console.log(`[DEBUG] Total permutations: ${totalPermutations}`); // Debug log

                let processed = 0;
                let batchCount = 0;

                for (const perm of generatePermutations(numPlayers, stacks, totalChips)) {
                    const { indices, probability } = perm;
                    for (let pos = 0; pos < numPlayers; pos++) {
                        const playerIdx = indices[pos];
                        icmValues[playerIdx] += probability * payoutArray[pos];
                    }
                    processed++;
                    batchCount++;
                    if (batchCount >= BATCH_SIZE) {
                        batchCount = 0;
                        progressText.textContent = `Processed ${processed.toLocaleString()} of ${totalPermutations.toLocaleString()}...`;
                    }
                }
                progressText.textContent = `Processed all ${totalPermutations.toLocaleString()} permutations.`;
            }

            // Render results
            renderResults(players, payouts, icmValues, totalChips, totalPayout, useMonteCarlo);

        } catch (error) {
            alert(`Error calculating ICM: ${error.message}`);
            console.error(error);
        } finally {
            loadingDiv.style.display = 'none';
            calculateBtn.disabled = false;
        }
    }, 10);
}

// =========== RESULTS RENDERING ==========
function renderResults(players, payouts, icmValues, totalChips, totalPayout, useMonteCarlo) {
    const totalICM = icmValues.reduce((sum, val) => sum + val, 0.0);
    const tolerance = 0.001 * totalPayout; // 0.1% of total payout
    const verificationPassed = Math.abs(totalICM - totalPayout) < tolerance;

    console.log(`[DEBUG] Total ICM: ${totalICM}, Total Payout: ${totalPayout}, Difference: ${Math.abs(totalICM - totalPayout)}`);

    // Payout structure table
    const payoutRows = payouts.map((payout, i) => `
        <tr>
            <td>${i + 1}th</td>
            <td>$${payout.toLocaleString()}</td>
        </tr>
    `).join('');

    // Chip stacks table
    const chipRows = players.map((player, i) => {
        const percent = (player.stack / totalChips * 100).toFixed(1);
        return `
            <tr>
                <td>${player.name}</td>
                <td>${player.stack.toLocaleString()}</td>
                <td>${percent}%</td>
            </tr>
        `;
    }).join('');

    // ICM results table
    const icmRows = players.map((player, i) => {
        const chipPercent = (player.stack / totalChips * 100).toFixed(2);
        const icmPercent = (icmValues[i] / totalICM * 100).toFixed(2);
        return `
            <tr>
                <td>${player.name}</td>
                <td>${player.stack.toLocaleString()}</td>
                <td>$${icmValues[i].toFixed(2)}</td>
                <td>${chipPercent}%</td>
                <td>${icmPercent}%</td>
            </tr>
        `;
    }).join('');

    // Construct the full HTML
    const resultsHTML = `
        <div style="margin-bottom: 20px;">
            <h3 style="color: var(--primary); margin-bottom: 15px;">Tournament Configuration</h3>

            <h4>Payout Structure</h4>
            <table style="margin-bottom: 20px;">
                <thead>
                    <tr>
                        <th>Place</th>
                        <th>Payout</th>
                    </tr>
                </thead>
                <tbody>
                    ${payoutRows}
                </tbody>
                <tfoot>
                    <tr>
                        <td><strong>Total Pool</strong></td>
                        <td><strong>$${totalPayout.toLocaleString()}</strong></td>
                    </tr>
                </tfoot>
            </table>

            <h4>Current Chip Stacks</h4>
            <table style="margin-bottom: 20px;">
                <thead>
                    <tr>
                        <th>Player</th>
                        <th>Chips</th>
                        <th>%</th>
                    </tr>
                </thead>
                <tbody>
                    ${chipRows}
                </tbody>
                <tfoot>
                    <tr>
                        <td><strong>Total</strong></td>
                        <td><strong>${totalChips.toLocaleString()}</strong></td>
                        <td><strong>100%</strong></td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <h3 style="color: var(--primary); margin-bottom: 15px;">ICM Results</h3>
        <table>
            <thead>
                <tr>
                    <th>Player</th>
                    <th>Chip Stack</th>
                    <th>ICM Value</th>
                    <th>Chip %</th>
                    <th>ICM %</th>
                </tr>
            </thead>
            <tbody>
                ${icmRows}
            </tbody>
            <tfoot>
                <tr class="total-row">
                    <td><strong>TOTAL</strong></td>
                    <td><strong>${totalChips.toLocaleString()}</strong></td>
                    <td><strong>$${totalICM.toFixed(2)}</strong></td>
                    <td><strong>100%</strong></td>
                    <td><strong>100%</strong></td>
                </tr>
            </tfoot>
        </table>

        <div style="margin-top: 20px; padding: 15px; background: var(--bg); border-radius: 8px;">
            <p>
                <strong>Verification:</strong>
                Total ICM ($${totalICM.toFixed(2)}) ⅈ Total payout pool ($${totalPayout.toLocaleString()})
            </p>
            <p>
                <strong>Status:</strong>
                <span class="status ${verificationPassed ? 'status-pass' : 'status-fail'}">
                    ${verificationPassed ? 'PASS' : &FAIL'}
                </span>
            </p>
        </div>
    `;

    // Update the DOM
    resultsContent.innerHTML = resultsHTML;
    resultsDiv.style.display = 'block';
    explanationDiv.style.display = 'block';

    // Scroll to results
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
