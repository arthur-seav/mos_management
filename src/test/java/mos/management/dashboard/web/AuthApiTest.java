package mos.management.dashboard.web;

import mos.management.dashboard.entity.AccountStatus;
import mos.management.dashboard.entity.User;
import mos.management.dashboard.entity.UserRole;
import mos.management.dashboard.support.ApiTest;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthApiTest extends ApiTest {

    @Test
    void customerSignsInWithEmailOrAnySpellingOfThePhone() throws Exception {
        customer();
        mvc.perform(postJson("/api/app/auth/sign-in", """
                        {"identifier": "Customer@Example.com", "password": "secret123"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.role").value("customer"))
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist());   // NFR-05
        mvc.perform(postJson("/api/app/auth/sign-in", """
                        {"identifier": "+855 12 345 678", "password": "secret123"}"""))
                .andExpect(status().isOk());
    }

    @Test
    void wrongPasswordGivesOneMessageForBothMistakes() throws Exception {   // TC-04
        customer();
        mvc.perform(postJson("/api/app/auth/sign-in", """
                        {"identifier": "customer@example.com", "password": "wrong-pass"}"""))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Incorrect email/phone or password."));
        mvc.perform(postJson("/api/app/auth/sign-in", """
                        {"identifier": "nobody@example.com", "password": "secret123"}"""))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Incorrect email/phone or password."));
    }

    @Test
    void eachClientOnlyLetsItsOwnRolesIn() throws Exception {   // SA 1.5, FR-05
        customer();
        staff();
        mvc.perform(postJson("/api/admin/auth/sign-in", """
                        {"identifier": "customer@example.com", "password": "secret123"}"""))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("wrong_client"));
        mvc.perform(postJson("/api/app/auth/sign-in", """
                        {"identifier": "staff@example.com", "password": "secret123"}"""))
                .andExpect(status().isForbidden());
        mvc.perform(postJson("/api/admin/auth/sign-in", """
                        {"identifier": "staff@example.com", "password": "secret123"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("staff"));
    }

    @Test
    void tokensOnlyOpenTheirOwnSideOfTheApi() throws Exception {
        User customer = customer();
        User staff = staff();
        mvc.perform(getAs(customer, "/api/admin/me")).andExpect(status().isForbidden());
        mvc.perform(getAs(staff, "/api/app/me")).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/me")).andExpect(status().isUnauthorized());
        mvc.perform(getAs(staff, "/api/admin/me")).andExpect(jsonPath("$.email").value("staff@example.com"));
    }

    @Test
    void deactivatedAccountIsLockedOutAtOnceEvenWithAToken() throws Exception {   // FR-27, FR-31
        User staff = staff();
        String token = bearer(staff);
        staff.setStatus(AccountStatus.INACTIVE);
        users.save(staff);
        mvc.perform(get("/api/admin/me").header("Authorization", token)).andExpect(status().isUnauthorized());
        mvc.perform(postJson("/api/admin/auth/sign-in", """
                        {"identifier": "staff@example.com", "password": "secret123"}"""))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("account_inactive"));
    }

    @Test
    void signUpCreatesACustomerWhoIsSignedIn() throws Exception {   // TC-02
        mvc.perform(postJson("/api/app/auth/sign-up", """
                        {"firstName": "Dara", "lastName": "Sok", "email": "dara@example.com",
                         "phone": "012-999-888", "password": "longenough"}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.phone").value("012999888"));
        User saved = users.findByEmailIgnoreCase("dara@example.com").orElseThrow();
        assertThat(saved.getRole()).isEqualTo(UserRole.CUSTOMER);
        assertThat(saved.getPasswordHash()).startsWith("{bcrypt}").doesNotContain("longenough");   // NFR-05
    }

    @Test
    void signUpRefusesATakenEmailOrPhone() throws Exception {   // TC-03
        customer();
        mvc.perform(postJson("/api/app/auth/sign-up", """
                        {"firstName": "A", "email": "customer@example.com", "password": "longenough"}"""))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("This email is already registered."));
        mvc.perform(postJson("/api/app/auth/sign-up", """
                        {"firstName": "A", "phone": "+85512345678", "password": "longenough"}"""))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("This phone number is already registered."));
        assertThat(users.count()).isEqualTo(1);
    }

    @Test
    void signUpNeedsAContactAndAnEightCharacterPassword() throws Exception {
        mvc.perform(postJson("/api/app/auth/sign-up", """
                        {"firstName": "A", "password": "longenough"}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("contact_required"));
        mvc.perform(postJson("/api/app/auth/sign-up", """
                        {"firstName": "A", "email": "a@example.com", "password": "short"}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("weak_password"));
    }

    @Test
    void forgottenPasswordResetSwapsThePassword() throws Exception {   // TC-05
        customer();
        String body = mvc.perform(postJson("/api/app/auth/reset/verify", """
                        {"phone": "012 345 678"}"""))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String ticket = body.replaceAll(".*\"ticket\":\"([^\"]+)\".*", "$1");
        mvc.perform(postJson("/api/app/auth/reset", "{\"ticket\": \"" + ticket + "\", \"newPassword\": \"brandnew99\"}"))
                .andExpect(status().isNoContent());
        mvc.perform(postJson("/api/app/auth/sign-in", """
                        {"identifier": "012345678", "password": "brandnew99"}"""))
                .andExpect(status().isOk());
        mvc.perform(postJson("/api/app/auth/sign-in", """
                        {"identifier": "012345678", "password": "secret123"}"""))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void resetWithAnUnknownPhoneStopsAtStepOne() throws Exception {   // TC-06
        mvc.perform(postJson("/api/app/auth/reset/verify", """
                        {"phone": "098 000 111"}"""))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Account not found."));
    }

    @Test
    void aResetTicketIsNotASignInTokenAndExpires() throws Exception {
        User customer = customer();
        String ticket = tokens.resetTicket(customer);
        mvc.perform(get("/api/app/me").header("Authorization", "Bearer " + ticket)).andExpect(status().isUnauthorized());
        clock.advance(Duration.ofMinutes(12));   // 10 min life + 1 min allowed clock skew
        mvc.perform(postJson("/api/app/auth/reset", "{\"ticket\": \"" + ticket + "\", \"newPassword\": \"brandnew99\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("reset_expired"));
    }

    @Test
    void editProfileSavesTheNewPhone() throws Exception {   // TC-07
        User customer = customer();
        user(UserRole.CUSTOMER, "other@example.com", "098765432");
        mvc.perform(putAs(customer, "/api/app/me", """
                        {"firstName": "Dara", "lastName": "Sok", "email": "customer@example.com", "phone": "011 222 333"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").value("011222333"));
        mvc.perform(putAs(customer, "/api/app/me", """
                        {"firstName": "Dara", "lastName": "Sok", "phone": "098765432"}"""))
                .andExpect(status().isConflict());
    }

    @Test
    void everyRoleChangesItsOwnPasswordWithTheCurrentOne() throws Exception {   // FR-30
        User admin = admin();
        mvc.perform(postAs(admin, "/api/admin/me/password", """
                        {"currentPassword": "nope-nope", "newPassword": "brandnew99"}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("wrong_password"));
        mvc.perform(postAs(admin, "/api/admin/me/password", """
                        {"currentPassword": "secret123", "newPassword": "brandnew99"}"""))
                .andExpect(status().isNoContent());
        mvc.perform(postJson("/api/admin/auth/sign-in", """
                        {"identifier": "admin@example.com", "password": "brandnew99"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", startsWith("ey")));
    }
}
