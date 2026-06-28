#include <stdio.h>
#include <stdlib.h>
#include <math.h>

#define NUM_PLAYERS 5
#define ICM_TOLERANCE 0.0001L

// ==================== FACTORIAL FUNCTION ====================
long factorial(int n) {
    if (n <= 1) return 1;
    long result = 1;
    for (int i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

// ==================== PERMUTATION GENERATOR (DEBUGGED) ====================
void generate_permutations(int n, long *stacks, long total_chips,
                          long *payouts, long double *icm_values) {
    int *index = malloc(n * sizeof(int));
    int *c = malloc(n * sizeof(int));
    if (index == NULL || c == NULL) {
        fprintf(stderr, "Memory allocation failed.\n");
        exit(EXIT_FAILURE);
    }

    for (int i = 0; i < n; i++) {
        index[i] = i;
        c[i] = 0;
    }

    long double total_prob = 0.0L;
    int permutation_count = 0;

    // Start with the first permutation (identity)
    {
        long double permutation_prob = 1.0L;
        long remaining_chips = total_chips;

        for (int pos = 0; pos < n; pos++) {
            int player_idx = index[pos];
            if (stacks[player_idx] == 0) {
                permutation_prob = 0.0L;
                break;
            }
            permutation_prob *= (long double)stacks[player_idx] / remaining_chips;
            remaining_chips -= stacks[player_idx];
        }
        total_prob += permutation_prob;
        permutation_count++;

        for (int pos = 0; pos < n; pos++) {
            int player_idx = index[pos];
            icm_values[player_idx] += permutation_prob * payouts[pos];
        }
    }

    int i = 0;
    while (i < n) {
        if (c[i] < i) {
            int swap_with = (i % 2 == 0) ? 0 : c[i];
            int temp = index[i];
            index[i] = index[swap_with];
            index[swap_with] = temp;

            // Calculate probability for this permutation
            long double permutation_prob = 1.0L;
            long remaining_chips = total_chips;

            for (int pos = 0; pos < n; pos++) {
                int player_idx = index[pos];
                if (stacks[player_idx] == 0) {
                    permutation_prob = 0.0L;
                    break;
                }
                permutation_prob *= (long double)stacks[player_idx] / remaining_chips;
                remaining_chips -= stacks[player_idx];
            }
            total_prob += permutation_prob;
            permutation_count++;

            for (int pos = 0; pos < n; pos++) {
                int player_idx = index[pos];
                icm_values[player_idx] += permutation_prob * payouts[pos];
            }

            c[i]++;
            i = 0;
        } else {
            c[i] = 0;
            i++;
        }
    }

    printf("DEBUG: Total permutations generated: %d (expected: %d)\n", permutation_count, factorial(n));
    printf("DEBUG: Total probability = %.10Lf (should be ~1.0)\n", total_prob);
    free(index);
    free(c);
}

// ==================== ICM CALCULATION ====================
void calculate_icm(long *stacks, long total_chips, long *payouts, long double *icm_values) {
    for (int i = 0; i < NUM_PLAYERS; i++) {
        icm_values[i] = 0.0L;
    }
    generate_permutations(NUM_PLAYERS, stacks, total_chips, payouts, icm_values);
}

// ==================== MAIN FUNCTION (HARDCODED TEST CASE) ====================
int main() {
    // Hardcoded test case: 5 players, total pot = 3700
    long stacks[NUM_PLAYERS] = {740, 740, 740, 740, 740}; // Equal stacks
    long payouts[NUM_PLAYERS] = {1500, 1000, 700, 300, 200}; // Sum = 3700
    long double icm_values[NUM_PLAYERS] = {0.0L};

    long total_chips = 0;
    long total_payout = 0;
    for (int i = 0; i < NUM_PLAYERS; i++) {
        total_chips += stacks[i];
        total_payout += payouts[i];
    }

    printf("TEST CASE:\n");
    printf("----------\n");
    printf("Stacks: [");
    for (int i = 0; i < NUM_PLAYERS; i++) {
        printf("%ld", stacks[i]);
        if (i < NUM_PLAYERS - 1) printf(", ");
    }
    printf("] (Total = %ld)\n", total_chips);

    printf("Payouts: [");
    for (int i = 0; i < NUM_PLAYERS; i++) {
        printf("%ld", payouts[i]);
        if (i < NUM_PLAYERS - 1) printf(", ");
    }
    printf("] (Total = %ld)\n\n", total_payout);

    // Calculate ICM
    calculate_icm(stacks, total_chips, payouts, icm_values);

    // Print results
    printf("ICM RESULTS:\n");
    printf("------------\n");
    long double total_icm = 0.0L;
    for (int i = 0; i < NUM_PLAYERS; i++) {
        total_icm += icm_values[i];
        printf("Player %d: ICM = $%.2Lf\n", i + 1, icm_values[i]);
    }
    printf("Total ICM: $%.2Lf\n", total_icm);
    printf("Total Payout: $%ld\n", total_payout);

    // Verification
    if (fabsl(total_icm - total_payout) < ICM_TOLERANCE) {
        printf("Status: PASS (Total ICM matches total payout)\n");
    } else {
        printf("Status: FAIL (Total ICM = %.2Lf, Total Payout = %ld)\n", total_icm, total_payout);
    }

    return 0;
}
