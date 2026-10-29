package mos.management.dashboard.repository;

import mos.management.dashboard.entity.ProductOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProductOptionRepository extends JpaRepository<ProductOption, Long> {

    @Query("""
            select po from ProductOption po
            join fetch po.option o
            where po.product.id = :productId
            order by o.sortOrder, o.id
            """)
    List<ProductOption> findForProduct(@Param("productId") Long productId);

    void deleteByProductId(Long productId);
}
