package mos.management.dashboard.web;

import mos.management.dashboard.entity.User;
import mos.management.dashboard.entity.UserRole;
import mos.management.dashboard.support.ApiTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminAccountApiTest extends ApiTest {

    User admin;
    User staff;
    User customer;

    @BeforeEach
    void setUp() {
        admin = admin();
        staff = staff();
        customer = customer();
    }

    @Test
    void adminAddsAStaffMemberWhoCanSignIn() throws Exception {   // FR-27
        mvc.perform(postAs(admin, "/api/admin/staff", """
                        {"firstName": "Sophea", "lastName": "Lim", "email": "sophea@mos.test", "role": "staff",
                         "password": "barista99"}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("staff"))
                .andExpect(jsonPath("$.status").value("active"));
        mvc.perform(postJson("/api/admin/auth/sign-in", """
                        {"identifier": "sophea@mos.test", "password": "barista99"}"""))
                .andExpect(status().isOk());
    }

    @Test
    void customersCannotBeCreatedAsStaffAndEmailsAreUnique() throws Exception {
        mvc.perform(postAs(admin, "/api/admin/staff", """
                        {"firstName": "X", "email": "x@mos.test", "role": "customer", "password": "barista99"}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("bad_role"));
        mvc.perform(postAs(admin, "/api/admin/staff", """
                        {"firstName": "X", "email": "customer@example.com", "role": "staff", "password": "barista99"}"""))
                .andExpect(status().isConflict());
    }

    @Test
    void adminChangesRolesAndDeactivatesAndReactivates() throws Exception {   // FR-27
        mvc.perform(putAs(admin, "/api/admin/staff/" + staff.getId(), """
                        {"firstName": "Test", "lastName": "staff", "email": "staff@example.com", "role": "admin"}"""))
                .andExpect(jsonPath("$.role").value("admin"));
        mvc.perform(patchAs(admin, "/api/admin/staff/" + staff.getId() + "/status", "{\"status\": \"inactive\"}"))
                .andExpect(jsonPath("$.status").value("inactive"));
        mvc.perform(getAs(staff, "/api/admin/me")).andExpect(status().isUnauthorized());
        mvc.perform(patchAs(admin, "/api/admin/staff/" + staff.getId() + "/status", "{\"status\": \"active\"}"))
                .andExpect(jsonPath("$.status").value("active"));
        mvc.perform(getAs(staff, "/api/admin/me")).andExpect(status().isOk());
    }

    @Test
    void anAdminCannotLockThemselvesOut() throws Exception {
        mvc.perform(patchAs(admin, "/api/admin/staff/" + admin.getId() + "/status", "{\"status\": \"inactive\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("self_lockout"));
        mvc.perform(putAs(admin, "/api/admin/staff/" + admin.getId(), """
                        {"firstName": "Test", "email": "admin@example.com", "role": "staff"}"""))
                .andExpect(status().isConflict());
    }

    @Test
    void adminResetsAStaffPassword() throws Exception {
        mvc.perform(postAs(admin, "/api/admin/staff/" + staff.getId() + "/password", "{\"newPassword\": \"fresh-start1\"}"))
                .andExpect(status().isOk());
        mvc.perform(postJson("/api/admin/auth/sign-in", """
                        {"identifier": "staff@example.com", "password": "fresh-start1"}"""))
                .andExpect(status().isOk());
    }

    @Test
    void staffListShowsOnlyStaffAndCustomerListOnlyCustomers() throws Exception {   // FR-27, FR-31
        mvc.perform(getAs(admin, "/api/admin/staff")).andExpect(jsonPath("$.items[*].role").value(contains("admin", "staff")));
        mvc.perform(getAs(admin, "/api/admin/customers?q=0123")).andExpect(jsonPath("$.items[*].email").value(contains("customer@example.com")));
        mvc.perform(getAs(admin, "/api/admin/customers?q=nobody")).andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void adminDeactivatesACustomer() throws Exception {   // FR-31
        mvc.perform(patchAs(admin, "/api/admin/customers/" + customer.getId() + "/status", "{\"status\": \"inactive\"}"))
                .andExpect(jsonPath("$.status").value("inactive"));
        mvc.perform(postJson("/api/app/auth/sign-in", """
                        {"identifier": "customer@example.com", "password": "secret123"}"""))
                .andExpect(status().isForbidden());
        mvc.perform(patchAs(admin, "/api/admin/customers/" + staff.getId() + "/status", "{\"status\": \"inactive\"}"))
                .andExpect(status().isNotFound());   // not a customer
    }

    @Test
    void staffHaveNoAccessToAccounts() throws Exception {   // SA 1.5
        mvc.perform(getAs(staff, "/api/admin/staff")).andExpect(status().isForbidden());
        mvc.perform(getAs(staff, "/api/admin/customers")).andExpect(status().isForbidden());
        User other = user(UserRole.STAFF, "other@mos.test", null);
        mvc.perform(patchAs(staff, "/api/admin/staff/" + other.getId() + "/status", "{\"status\": \"inactive\"}"))
                .andExpect(status().isForbidden());
    }
}
