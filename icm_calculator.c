#include <stdio.h>
#include <stdlib.h>
#include <math.h>

#define NUM_PLAYERS 5
#define ICM_TOLERANCE 0.0001L

long factorial(int n) {
    if (n <= 1) return 1;
    long result = 1;
    for (int i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

void generate_permutations(int n, long *stacks, long total_chips, long *payouts, long double *icm_values) {
    int *index = malloc(n * sizeof(int));
    int *c = malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) {
        index[i] = i;
        c[i] = 0;
    }

    long double total_prob = 0.0L;
    int i = 0;
    while (i < n) {
        if (c[i] < i) {
            int swap_with = (i % 2 == 0) ? 0 : c[i];
            int temp = index[i];
            index[i] = index[swap_with];
            index[swap_with] = temp;
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

int main() {
    return 0;
}
