#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <string.h>

#define MAX_PLAYERS 8
#define MAX_NAME_LENGTH 50
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

// ==================== INPUT FUNCTIONS ====================
int get_int_input(const char *prompt, int min, int max) {
    int value;
    while (1) {
        printf("%s (%d-%d): ", prompt, min, max);
        if (scanf("%d", &value) != 1) {
            printf("Invalid input. Please enter a number.\n");
            while (getchar() != '\n');
            continue;
        }
        while (getchar() != '\n');

        if (value >= min && value <= max) {
            return value;
        }
        printf("Please enter a value between %d and %d.\n", min, max);
    }
}

long get_long_input(const char *prompt, long min) {
    long value;
    while (1) {
        printf("%s (>= %ld): ", prompt, min);
        if (scanf("%ld", &value) != 1) {
            printf("Invalid input. Please enter a number.\n");
            while (getchar() != '\n');
            continue;
        }
        while (getchar() != '\n');

        if (value >= min) {
            return value;
        }
        printf("Please enter a value >= %ld.\n", min);
    }
}

void get_string_input(const char *prompt, char *buffer, int size) {
    printf("%s: ", prompt);
    if (fgets(buffer, size, stdin) == NULL) {
        buffer[0] = '\0';
    } else {
        buffer[strcspn(buffer, "\n")] = '\0';
    }
}

// ==================== PERMUTATION GENERATOR (FIXED) ====================
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

    // Process the first permutation (identity permutation)
    {
        long double permutation_prob = 1.0L;
        long remaining_chips = total_chips;

        for (int pos = 0; pos < n; pos++) {
            int player_idx = index[pos];
            if (stacks[player_idx] == 0) {
                permutation_prob = 0.0L;
                break;
            }
            permutation_prob *= (long double)stacks[player_idx] / (long double)remaining_chips;
            remaining_chips -= stacks[player_idx];
        }
        total_prob += permutation_prob;
        permutation_count++;

        for (int pos = 0; pos < n; pos++) {
            int player_idx = index[pos];
            icm_values[player_idx] += permutation_prob * payouts[pos];
        }
    }

    // Generate the remaining permutations using Heap's algorithm
    int i = 0;
    while (i < n) {
        if (c[i] < i) {
            int swap_with = (i % 2 == 0) ? 0 : c[i];
            int temp = index[i];
            index[i] = index[swap_with];
            index[swap_with] = temp;

            long double permutation_prob = 1.0L;
            long remaining_chips = total_chips;

            for (int pos = 0; pos < n; pos++) {
                int player_idx = index[pos];
                if (stacks[player_idx] == 0) {
                    permutation_prob = 0.0L;
                    break;
                }
                permutation_prob *= (long double)stacks[player_idx] / (long double)remaining_chips;
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

    free(index);
    free(c);
}

// ==================== ICM CALCULATION ====================
void calculate_icm(int num_players, long *stacks, long total_chips,
                  long *payouts, long double *icm_values) {
    for (int i = 0; i < num_players; i++) {
        icm_values[i] = 0.0L;
    }
    generate_permutations(num_players, stacks, total_chips, payouts, icm_values);
}

// ==================== OUTPUT FUNCTIONS ====================
void print_header() {
    printf("\n");
    printf("==========================================================\n");
    printf("          INDEPENDENT CHIP MODEL (ICM) CALCULATOR         \n");
    printf("==========================================================\n\n");
}

void print_configuration(int num_players, char names[][MAX_NAME_LENGTH],
                         long *stacks, long *payouts,
                         long total_chips, long total_payout) {
    printf("Tournament Configuration:\n");
    printf("----------------------------\n");
    printf("Number of players: %d (All in the money)\n\n", num_players);

    printf("Payout Structure:\n");
    printf("------------------\n");
    for (int i = 0; i < num_players; i++) {
        printf("  %dth place: $%ld\n", i+1, payouts[i]);
    }
    printf("  Total payout pool: $%ld\n\n", total_payout);

    printf("Current Chip Stacks:\n");
    printf("--------------------\n");
    for (int i = 0; i < num_players; i++) {
        long double percent = (long double)stacks[i] / total_chips * 100.0L;
        printf("  %-10s: %ld chips (%.1Lf%%)\n", names[i], stacks[i], percent);
    }
    printf("  Total chips: %ld\n\n", total_chips);
}

void print_explanation(int num_players) {
    long num_permutations = factorial(num_players);

    printf("HOW ICM IS CALCULATED:\n");
    printf("-----------------------\n");
    printf("For %d players, there are %d! = %ld possible finishing orders.\n\n",
           num_players, num_players, num_permutations);

    printf("For EACH possible order:\n");
    printf("  Step 1: Calculate probability of that exact finishing order\n");
    printf("          Probability = (stack_P1/total) * (stack_P2/(total-P1)) * ...\n");
    printf("          Example: Order [P1, P2, P3] with stacks [150K, 120K, 90K]\n");
    printf("          Probability = (150000/360000) * (120000/210000) * (90000/90000)\n\n");

    printf("  Step 2: For each player, add: probability * their_payout_in_that_order\n");
    printf("          to their running ICM total\n\n");

    printf("After ALL %ld orders are processed:\n", num_permutations);
    printf("  - Each player's ICM = sum of all their contributions\n");
    printf("  - Total of all ICM values = Total payout pool\n\n");
}

void print_results(int num_players, char names[][MAX_NAME_LENGTH],
                   long *stacks, long double *icm_values,
                   long total_chips, long total_payout) {
    printf("ICM RESULTS:\n");
    printf("-----------\n\n");

    printf("%-12s | %-15s | %-12s | %-10s | %-10s\n",
           "Player", "Chip Stack", "ICM Value", "Chip %", "ICM %");
    printf("----------------------------------------------------------------\n");

    long double total_icm = 0.0L;
    for (int i = 0; i < num_players; i++) {
        total_icm += icm_values[i];
    }

    for (int i = 0; i < num_players; i++) {
        long double chip_percent = (long double)stacks[i] / total_chips * 100.0L;
        long double icm_percent = (long double)icm_values[i] / total_icm * 100.0L;

        printf("%-12s | %-15ld | $%-11.2Lf | %-9.2Lf%% | %-9.2Lf%%\n",
               names[i], stacks[i], icm_values[i], chip_percent, icm_percent);
    }

    printf("----------------------------------------------------------------\n");
    printf("%-12s | %-15s | $%-11.2Lf | %-9s | %-9.2Lf%%\n",
           "TOTAL", "", total_icm, "", 100.0L);
    printf("\n");

    printf("VERIFICATION: Total ICM ($%.2Lf) = Total payout pool ($%ld)\n",
           total_icm, total_payout);
    printf("Status: %s\n\n",
           fabsl(total_icm - total_payout) < ICM_TOLERANCE ? "PASS" : "FAIL");
}

// ==================== MAIN FUNCTION ====================
int main() {
    int num_players;
    char names[MAX_PLAYERS][MAX_NAME_LENGTH];
    long *stacks = malloc(MAX_PLAYERS * sizeof(long));
    long *payouts = malloc(MAX_PLAYERS * sizeof(long));
    long double *icm_values = malloc(MAX_PLAYERS * sizeof(long double));

    if (stacks == NULL || payouts == NULL || icm_values == NULL) {
        fprintf(stderr, "Memory allocation failed.\n");
        return EXIT_FAILURE;
    }

    // Get number of players
    printf("\n");
    printf("ICM CALCULATOR - Dynamic Input\n");
    printf("================================\n\n");
    num_players = get_int_input("Enter number of players", 1, MAX_PLAYERS);

    if (num_players > 8) {
        printf("Warning: Calculations for >8 players may be slow.\n");
    }

    // Get player names and chip stacks
    printf("\n");
    for (int i = 0; i < num_players; i++) {
        char buffer[MAX_NAME_LENGTH];
        sprintf(buffer, "Player %d name", i+1);
        get_string_input(buffer, names[i], MAX_NAME_LENGTH);
        if (names[i][0] == '\0') {
            sprintf(names[i], "Player %d", i+1);
        }

        sprintf(buffer, "%s chip stack", names[i]);
        stacks[i] = get_long_input(buffer, 1);
    }

    // Get payout structure
    printf("\n");
    for (int i = 0; i < num_players; i++) {
        char buffer[MAX_NAME_LENGTH];
        sprintf(buffer, "Payout for %dth place", i+1);
        payouts[i] = get_long_input(buffer, 0);
    }

    // Calculate totals
    long total_chips = 0;
    long total_payout = 0;
    for (int i = 0; i < num_players; i++) {
        total_chips += stacks[i];
        total_payout += payouts[i];
    }

    // Validate total chips
    if (total_chips == 0) {
        printf("Error: Total chips must be > 0.\n");
        free(stacks);
        free(payouts);
        free(icm_values);
        return EXIT_FAILURE;
    }

    // Print configuration and calculate ICM
    print_header();
    print_configuration(num_players, names, stacks, payouts, total_chips, total_payout);
    print_explanation(num_players);

    // Calculate ICM values
    calculate_icm(num_players, stacks, total_chips, payouts, icm_values);

    print_results(num_players, names, stacks, icm_values, total_chips, total_payout);

    printf("Calculation complete!\n");
    printf("The ICM values show the monetary equity of each player's chips.\n");
    printf("Compare 'Chip %%' vs 'ICM %%' to see how chip value is non-linear.\n\n");

    free(stacks);
    free(payouts);
    free(icm_values);
    return EXIT_SUCCESS;
}
