package mos.management.dashboard.repository;

import mos.management.dashboard.entity.User;
import mos.management.dashboard.entity.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByPhone(String phone);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByPhone(String phone);

    @Query("""
            select u from User u
            where u.role in :roles
              and (:q = '' or lower(concat(u.firstName, ' ', u.lastName)) like lower(concat('%', :q, '%'))
                   or lower(coalesce(u.email, '')) like lower(concat('%', :q, '%'))
                   or coalesce(u.phone, '') like concat('%', :q, '%'))
            """)
    Page<User> search(@Param("roles") Collection<UserRole> roles, @Param("q") String q, Pageable pageable);
}
