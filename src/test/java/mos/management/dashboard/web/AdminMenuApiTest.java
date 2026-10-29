package mos.management.dashboard.web;

import mos.management.dashboard.entity.User;
import mos.management.dashboard.support.ApiTest;
import mos.management.dashboard.support.MenuFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockMultipartFile;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminMenuApiTest extends ApiTest {

    @Autowired
    MenuFixture menu;

    User admin;
    User staff;

    @BeforeEach
    void setUp() {
        menu.build();
        admin = admin();
        staff = staff();
    }

    @Test
    void adminAddsEditsAndDeactivatesCategoriesAndDrinks() throws Exception {   // FR-25
        String created = mvc.perform(postAs(admin, "/api/admin/categories", """
                        {"name": "Tea", "sortOrder": 2}"""))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long teaId = Long.parseLong(created.replaceAll(".*\"id\":(\\d+).*", "$1"));

        mvc.perform(postAs(admin, "/api/admin/products", """
                        {"categoryId": %d, "name": "Jasmine Tea", "basePrice": 2.2, "description": "Floral"}""".formatted(teaId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.categoryName").value("Tea"))
                .andExpect(jsonPath("$.basePrice").value(2.20))
                .andExpect(jsonPath("$.isAvailable").value(true));

        mvc.perform(putAs(admin, "/api/admin/products/" + menu.latte.getId(), """
                        {"categoryId": %d, "name": "Café Latte", "basePrice": 3.25}""".formatted(menu.coffee.getId())))
                .andExpect(jsonPath("$.name").value("Café Latte"))
                .andExpect(jsonPath("$.basePrice").value(3.25));

        mvc.perform(patchAs(admin, "/api/admin/products/" + menu.mocha.getId() + "/active", "{\"isActive\": false}"))
                .andExpect(jsonPath("$.isActive").value(false));

        mvc.perform(putAs(admin, "/api/admin/categories/" + teaId, """
                        {"name": "Tea", "sortOrder": 2, "active": false}"""))
                .andExpect(jsonPath("$.active").value(false))
                .andExpect(jsonPath("$.productCount").value(1));
    }

    @Test
    void categoryNamesAreUnique() throws Exception {
        mvc.perform(postAs(admin, "/api/admin/categories", """
                        {"name": "coffee", "sortOrder": 9}"""))
                .andExpect(status().isConflict());
    }

    @Test
    void staffCanReadTheMenuAndMarkDrinksSoldOutButNotEditIt() throws Exception {   // SA 1.5, FR-22
        mvc.perform(getAs(staff, "/api/admin/products")).andExpect(jsonPath("$", hasSize(4)));
        mvc.perform(patchAs(staff, "/api/admin/products/" + menu.mocha.getId() + "/availability",
                        "{\"isAvailable\": false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isAvailable").value(false));
        mvc.perform(putAs(staff, "/api/admin/products/" + menu.latte.getId(), """
                        {"categoryId": %d, "name": "Latte", "basePrice": 0.10}""".formatted(menu.coffee.getId())))
                .andExpect(status().isForbidden());
        mvc.perform(postAs(staff, "/api/admin/categories", "{\"name\": \"X\", \"sortOrder\": 1}"))
                .andExpect(status().isForbidden());
        mvc.perform(getAs(staff, "/api/admin/option-groups")).andExpect(status().isForbidden());
    }

    @Test
    void customizationUsesTheDrinksOwnPricesAndDefaults() throws Exception {   // TC-11, TC-14, TC-15
        mvc.perform(getAs(staff, "/api/admin/products/" + menu.latte.getId() + "/customization"))
                .andExpect(jsonPath("$.groups[*].name").value(contains("Size", "Temperature", "Ice level", "Sweetness", "Add-ons")))
                .andExpect(jsonPath("$.groups[0].options[*].name").value(contains("Small", "Medium", "Large")))
                .andExpect(jsonPath("$.groups[0].options[2].extraPrice").value(1.00))
                .andExpect(jsonPath("$.groups[0].defaultOptionId").value(menu.medium.getId()))
                .andExpect(jsonPath("$.lowestPrice").value(3.00));
        mvc.perform(getAs(staff, "/api/admin/products/" + menu.americano.getId() + "/customization"))
                .andExpect(jsonPath("$.groups[0].options[2].extraPrice").value(0.50));
    }

    @Test
    void hotOnlyDrinkHasNoIceLevel() throws Exception {   // TC-10
        mvc.perform(getAs(staff, "/api/admin/products/" + menu.espresso.getId() + "/customization"))
                .andExpect(jsonPath("$.groups[*].name").value(contains("Temperature", "Sweetness")))
                .andExpect(jsonPath("$.groups[0].options[*].name").value(contains("Hot")));
    }

    @Test
    void adminSetsWhatADrinkOffersWithItsOwnPrice() throws Exception {   // FR-26
        mvc.perform(putAs(admin, "/api/admin/products/" + menu.mocha.getId() + "/options", """
                        {"groups": [
                          {"groupId": %d, "isActive": true, "defaultOptionId": %d,
                           "options": [{"optionId": %d}, {"optionId": %d, "priceOverride": 1.20}]}
                        ]}""".formatted(menu.size.getId(), menu.small.getId(), menu.small.getId(), menu.large.getId())))
                .andExpect(status().isOk());
        mvc.perform(getAs(admin, "/api/admin/products/" + menu.mocha.getId() + "/customization"))
                .andExpect(jsonPath("$.groups", hasSize(1)))
                .andExpect(jsonPath("$.groups[0].options[*].name").value(contains("Small", "Large")))
                .andExpect(jsonPath("$.groups[0].options[1].extraPrice").value(1.20))
                .andExpect(jsonPath("$.groups[0].defaultOptionId").value(menu.small.getId()));
    }

    @Test
    void aDefaultThatIsNotOfferedIsRefused() throws Exception {
        mvc.perform(putAs(admin, "/api/admin/products/" + menu.mocha.getId() + "/options", """
                        {"groups": [{"groupId": %d, "isActive": true, "defaultOptionId": %d,
                                     "options": [{"optionId": %d}]}]}""".formatted(
                        menu.size.getId(), menu.large.getId(), menu.small.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("bad_default"));
        // nothing was changed
        mvc.perform(getAs(admin, "/api/admin/products/" + menu.mocha.getId() + "/customization"))
                .andExpect(jsonPath("$.groups[0].options", hasSize(3)));
    }

    @Test
    void optionGroupsAndOptionsAreManaged() throws Exception {   // FR-26
        mvc.perform(postAs(admin, "/api/admin/option-groups", """
                        {"name": "Milk", "selectionType": "single", "isRequired": false, "maxSelect": 5, "sortOrder": 6}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.maxSelect").value(1));   // single = 1
        mvc.perform(putAs(admin, "/api/admin/options/" + menu.oatMilk.getId(), """
                        {"name": "Oat milk", "extraPrice": 0.7, "sortOrder": 1, "isIced": false}"""))
                .andExpect(jsonPath("$.extraPrice").value(0.70));
        mvc.perform(getAs(admin, "/api/admin/option-groups"))
                .andExpect(jsonPath("$[*].name").value(contains("Size", "Temperature", "Ice level", "Sweetness", "Add-ons", "Milk")));
    }

    @Test
    void adminUploadsAPicture() throws Exception {
        var file = new MockMultipartFile("file", "latte.png", "image/png", new byte[]{1, 2, 3});
        mvc.perform(multipart("/api/admin/products/" + menu.latte.getId() + "/image").file(file)
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imageUrl", startsWith("/uploads/product-")));
        var text = new MockMultipartFile("file", "x.txt", "text/plain", new byte[]{1});
        mvc.perform(multipart("/api/admin/products/" + menu.latte.getId() + "/image").file(text)
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isBadRequest());
    }
}
