package mos.management.dashboard.service.menu;

import mos.management.dashboard.config.MosProperties;
import mos.management.dashboard.dto.MenuDtos.CategoryRequest;
import mos.management.dashboard.dto.MenuDtos.CategoryView;
import mos.management.dashboard.dto.MenuDtos.ProductRequest;
import mos.management.dashboard.dto.MenuDtos.ProductView;
import mos.management.dashboard.entity.Category;
import mos.management.dashboard.entity.Product;
import mos.management.dashboard.exception.ApiException;
import mos.management.dashboard.repository.CategoryRepository;
import mos.management.dashboard.repository.ProductRepository;
import mos.management.dashboard.util.Text;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Clock;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/** Categories and drinks for admins (FR-25), sold-out switch for staff too (FR-22). */
@Service
@Transactional
public class MenuAdminService {

    private static final Map<String, String> IMAGE_TYPES = Map.of(
            "image/jpeg", ".jpg", "image/png", ".png", "image/webp", ".webp");

    private final CategoryRepository categories;
    private final ProductRepository products;
    private final Path uploadDir;
    private final Clock clock;

    public MenuAdminService(CategoryRepository categories, ProductRepository products, MosProperties properties,
                            Clock clock) {
        this.categories = categories;
        this.products = products;
        this.uploadDir = Path.of(properties.uploadDir()).toAbsolutePath();
        this.clock = clock;
    }

    // ---- categories ----

    @Transactional(readOnly = true)
    public List<CategoryView> categories() {
        return categories.findAllByOrderBySortOrderAscIdAsc().stream()
                .map(c -> CategoryView.of(c, products.countByCategoryId(c.getId())))
                .toList();
    }

    public CategoryView createCategory(CategoryRequest req) {
        String name = req.name().trim();
        if (categories.existsByNameIgnoreCase(name)) {
            throw ApiException.conflict("name_taken", "A category with this name already exists.");
        }
        Category c = new Category(name, req.sortOrder());
        if (req.active() != null) c.setActive(req.active());
        return CategoryView.of(categories.save(c), 0);
    }

    public CategoryView updateCategory(long id, CategoryRequest req) {
        Category c = categories.findById(id).orElseThrow(() -> ApiException.notFound("Category"));
        String name = req.name().trim();
        if (categories.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw ApiException.conflict("name_taken", "A category with this name already exists.");
        }
        c.setName(name);
        c.setSortOrder(req.sortOrder());
        if (req.active() != null) c.setActive(req.active());   // deactivate hides its drinks from the app
        return CategoryView.of(c, products.countByCategoryId(id));
    }

    // ---- products ----

    @Transactional(readOnly = true)
    public List<ProductView> products() {
        return products.findAllWithCategory().stream().map(ProductView::of).toList();
    }

    @Transactional(readOnly = true)
    public ProductView product(long id) {
        return ProductView.of(find(id));
    }

    public ProductView createProduct(ProductRequest req) {
        Product p = new Product(category(req.categoryId()), req.name().trim(), Text.blankToNull(req.description()),
                req.basePrice().setScale(2, RoundingMode.HALF_UP), clock.instant());
        p.setImageUrl(Text.trimOrEmpty(req.imageUrl()));
        if (req.isActive() != null) p.setActive(req.isActive());
        return ProductView.of(products.save(p));
    }

    /** Price changes leave placed orders alone: they keep their copied prices (BR-04). */
    public ProductView updateProduct(long id, ProductRequest req) {
        Product p = find(id);
        p.setCategory(category(req.categoryId()));
        p.setName(req.name().trim());
        p.setDescription(Text.blankToNull(req.description()));
        p.setBasePrice(req.basePrice().setScale(2, RoundingMode.HALF_UP));
        if (req.imageUrl() != null) p.setImageUrl(req.imageUrl().trim());
        if (req.isActive() != null) p.setActive(req.isActive());
        return ProductView.of(p);
    }

    /** FR-22 / TC-09: sold out, or back on sale. */
    public ProductView setAvailable(long id, boolean available) {
        Product p = find(id);
        p.setAvailable(available);
        return ProductView.of(p);
    }

    /** FR-25: deactivate takes the drink off the menu; past orders keep it. */
    public ProductView setActive(long id, boolean active) {
        Product p = find(id);
        p.setActive(active);
        return ProductView.of(p);
    }

    public ProductView uploadImage(long id, MultipartFile file) {
        Product p = find(id);
        String ext = file.getContentType() == null ? null : IMAGE_TYPES.get(file.getContentType().toLowerCase(Locale.ROOT));
        if (ext == null) throw ApiException.badRequest("bad_image", "Use a JPG, PNG or WebP picture.");
        String name = "product-" + id + "-" + UUID.randomUUID().toString().substring(0, 8) + ext;
        try (InputStream in = file.getInputStream()) {
            Files.createDirectories(uploadDir);
            Files.copy(in, uploadDir.resolve(name), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("Could not save the picture", e);
        }
        p.setImageUrl("/uploads/" + name);
        return ProductView.of(p);
    }

    private Product find(long id) {
        return products.findWithCategory(id).orElseThrow(() -> ApiException.notFound("Drink"));
    }

    private Category category(Long id) {
        return categories.findById(id).orElseThrow(() -> ApiException.badRequest("bad_category", "Choose a category."));
    }
}
