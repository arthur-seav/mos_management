package mos.management.dashboard.repository;

import mos.management.dashboard.entity.ProductOptionGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProductOptionGroupRepository extends JpaRepository<ProductOptionGroup, Long> {

    @Query("""
            select pog from ProductOptionGroup pog
            join fetch pog.group g
            left join fetch pog.defaultOption
            where pog.product.id = :productId
            order by g.sortOrder, g.id
            """)
    List<ProductOptionGroup> findForProduct(@Param("productId") Long productId);

    void deleteByProductId(Long productId);
}
