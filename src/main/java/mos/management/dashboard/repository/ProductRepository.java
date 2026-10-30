package mos.management.dashboard.repository;

import mos.management.dashboard.entity.Product;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {

    @EntityGraph(attributePaths = "category")
    @Query("select p from Product p order by p.category.sortOrder, p.category.id, p.name")
    List<Product> findAllWithCategory();

    @EntityGraph(attributePaths = "category")
    @Query("""
            select p from Product p
            where p.active = true and p.category.active = true
            order by p.category.sortOrder, p.category.id, p.name
            """)
    List<Product> findOnMenu();

    @EntityGraph(attributePaths = "category")
    List<Product> findByIdIn(List<Long> ids);

    long countByCategoryId(Long categoryId);

    @Query("select p from Product p join fetch p.category where p.id = :id")
    java.util.Optional<Product> findWithCategory(@Param("id") Long id);
}
